import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  Unsubscribe,
} from '@angular/fire/firestore';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  firstValueFrom,
  map,
} from 'rxjs';

import {
  FirestoreNegotiationThreadDto,
  FirestoreOfferDto,
  mapNegotiationThreadFromFirestore,
  mapNegotiationThreadToFirestore,
  mapOfferFromFirestore,
  mapOfferToFirestore,
} from '../mappers/firestore/marketplace.firestore.mapper';
import { Coin } from '../models/coin.model';
import { NegotiationMessage } from '../models/negotiation-message.model';
import {
  NegotiationThread,
  NegotiationThreadModel,
} from '../models/negotiation-thread.model';
import { OfferPhoto } from '../models/offer-photo.model';
import { Offer, OfferModel } from '../models/offer.model';
import { AuthService } from './auth.service';
import { ContentService } from './content.service';
import { LocalStorageService } from './local-storage.service';

const OFFERS_COLLECTION = 'offers';
const NEGOTIATIONS_COLLECTION = 'negotiations';

/**
 * Coordinates inventory, offers and negotiations using Firestore.
 * Now with real-time listeners for chat/negotiations.
 */
@Injectable({
  providedIn: 'root',
})
export class MarketplaceService implements OnDestroy {
  private readonly offersSubject = new BehaviorSubject<Offer[]>([]);
  private readonly negotiationsSubject = new BehaviorSubject<
    NegotiationThread[]
  >([]);
  private isInitialized = false;
  private negotiationsUnsubscribe: Unsubscribe | null = null;
  private offersUnsubscribe: Unsubscribe | null = null;

  readonly offers$ = this.offersSubject.asObservable();
  readonly negotiations$ = this.negotiationsSubject.asObservable();

  readonly catalog$ = this.contentService.coins$;

  readonly inventoryCards$: Observable<
    Array<{ coin: Coin; lastOffer?: Offer }>
  > = combineLatest([this.catalog$, this.offers$]).pipe(
    map(([coins, offers]) =>
      coins.map((coin) => ({
        coin,
        lastOffer: [...offers]
          .reverse()
          .find((offer) => offer.coinId === coin.id),
      })),
    ),
  );

  constructor(
    private readonly authService: AuthService,
    private readonly contentService: ContentService,
    private readonly firestore: Firestore,
    private readonly localStorageService: LocalStorageService,
  ) {}

  /**
   * Cleanup Firestore listeners when the service is destroyed.
   */
  ngOnDestroy(): void {
    this.unsubscribeAll();
  }

  /**
   * Loads offers and negotiations from Firestore on first access
   * and starts real-time listeners.
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const [firestoreOffers, firestoreNegotiations] = await Promise.all([
      this.loadOffersFromFirestore(),
      this.loadNegotiationsFromFirestore(),
    ]);

    this.offersSubject.next(OfferModel.fromJsonArray(firestoreOffers));
    this.negotiationsSubject.next(
      NegotiationThreadModel.fromJsonArray(firestoreNegotiations),
    );
    this.isInitialized = true;

    // Start real-time listeners for live updates
    this.startNegotiationsListener();
    this.startOffersListener();
  }

  /**
   * Returns a single coin from the Firestore catalog.
   */
  async getCoinById(coinId: string): Promise<Coin | undefined> {
    const catalog = await firstValueFrom(this.catalog$);
    return catalog.find((coin) => coin.id === coinId);
  }

  /**
   * Returns a single offer from persisted state.
   */
  getOfferById(offerId: string): Offer | undefined {
    return this.offersSubject.value.find((offer) => offer.id === offerId);
  }

  /**
   * Retrieves photos for a given offer from local storage.
   * Photos are stored separately from Firestore to avoid 1MB document limit.
   */
  async getOfferPhotos(offerId: string): Promise<OfferPhoto[]> {
    try {
      const photos = await this.localStorageService.getItem<OfferPhoto[]>(
        `offer_photos_${offerId}`,
      );
      return photos ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Returns a single negotiation thread from persisted state.
   */
  getNegotiationById(threadId: string): NegotiationThread | undefined {
    return this.negotiationsSubject.value.find(
      (thread) => thread.id === threadId,
    );
  }

  /**
   * Observable for a single negotiation thread that updates in real-time.
   */
  getNegotiationById$(threadId: string): Observable<NegotiationThread | undefined> {
    return this.negotiations$.pipe(
      map((threads) => threads.find((thread) => thread.id === threadId)),
    );
  }

  /**
   * Creates a new offer and stores it locally.
   */
  async publishOffer(input: {
    coinId: string;
    title: string;
    quantity: number;
    askPrice: number;
    description: string;
    era: string;
    condition: string;
    realValue: number;
    availableForTrade: boolean;
    photos: OfferPhoto[];
  }): Promise<Offer> {
    try {
      const profile = await this.resolveCurrentProfile();
      const offerId = `offer-${Date.now()}`;

      // Save photos locally (Ionic Storage) with the offer ID as key
      await this.localStorageService.setItem(
        `offer_photos_${offerId}`,
        input.photos,
      );

      // Strip dataUrl for OfferModel - only metadata goes to Firestore
      const safePhotos: OfferPhoto[] = input.photos.map((p) => ({
        kind: p.kind,
        label: p.label,
        dataUrl: '',
        brightness: p.brightness,
      }));
      const offer: Offer = new OfferModel({
        id: offerId,
        coinId: input.coinId,
        ownerId: profile.id,
        ownerDisplayName: profile.displayName,
        title: input.title,
        quantity: input.quantity,
        askPrice: input.askPrice,
        description: input.description,
        era: input.era,
        condition: input.condition,
        realValue: input.realValue,
        availableForTrade: input.availableForTrade,
        photos: safePhotos,
        status: 'negotiating',
        createdAt: new Date().toISOString(),
      });

      const updatedOffers = [...this.offersSubject.value, offer];
      const catalog = await firstValueFrom(this.catalog$);
      const proposerCoin =
        catalog.find((coin) => coin.id !== input.coinId) ?? catalog[0];
      const nextNegotiation: NegotiationThread = new NegotiationThreadModel({
        id: `thread-${Date.now()}`,
        offerId,
        offerCoinId: input.coinId,
        proposerCoinId: proposerCoin?.id ?? input.coinId,
        proposerName: profile.displayName,
        sellerName: 'Maria',
        status: 'pending',
        realValue: proposerCoin?.estimatedValue ?? input.askPrice,
        unreadCount: 1,
        messages: [
          {
            id: `msg-${Date.now()}`,
            userId: profile.id,
            displayName: profile.displayName,
            body: input.availableForTrade
              ? `Tenho interesse nesta oferta. Posso propor ${proposerCoin?.name ?? 'uma moeda do meu inventário'} para troca.`
              : 'Tenho interesse na compra imediata e gostava de validar o estado da moeda.',
            sentAt: new Date().toISOString(),
          },
        ],
      });
      const updatedNegotiations = [
        ...this.negotiationsSubject.value,
        nextNegotiation,
      ];

      this.offersSubject.next(updatedOffers);
      this.negotiationsSubject.next(updatedNegotiations);

      // Persist offer and negotiation separately so one failure doesn't block the other
      try {
        await this.persistOffer(offer);
        console.log('[publishOffer] Offer persisted to Firestore');
      } catch (err) {
        console.error('[publishOffer] Failed to persist offer to Firestore:', err);
        // Still keep the offer locally
      }

      try {
        await this.persistNegotiation(nextNegotiation);
        console.log('[publishOffer] Negotiation persisted to Firestore');
      } catch (err) {
        console.error('[publishOffer] Failed to persist negotiation to Firestore:', err);
        // Still keep the negotiation locally
      }

      return offer;
    } catch (err) {
      console.error('[publishOffer] FAILED:', err);
      // Throw a user-friendly error
      throw new Error('Não foi possível publicar a oferta. Verifica a consola do navegador para mais detalhes.');
    }
  }

  /**
   * Creates a negotiation thread directly from a coin detail proposal flow.
   */
  async createProposal(input: {
    offerCoinId: string;
    proposedCoinIds: string[];
    offerAmount?: number;
    message?: string;
  }): Promise<NegotiationThread> {
    const profile = await this.resolveCurrentProfile();
    const catalog = await firstValueFrom(this.catalog$);
    const offeredCoins = catalog.filter((coin) =>
      input.proposedCoinIds.includes(coin.id),
    );
    const primaryTradeCoin =
      offeredCoins[0] ?? catalog.find((coin) => coin.id !== input.offerCoinId);
    const proposalSummary = [
      input.offerAmount
        ? `Proponho ${new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
          }).format(input.offerAmount)}`
        : '',
      offeredCoins.length
        ? `para troca por ${offeredCoins.map((coin) => coin.name).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    const normalizedBody = input.message?.trim();
    const firstMessageBody = [
      proposalSummary || 'Tenho interesse nesta moeda.',
      normalizedBody,
    ]
      .filter(Boolean)
      .join(' ');
    const thread: NegotiationThread = new NegotiationThreadModel({
      id: `thread-${Date.now()}`,
      offerId: `proposal-${Date.now()}`,
      offerCoinId: input.offerCoinId,
      proposerCoinId: primaryTradeCoin?.id ?? input.offerCoinId,
      proposerName: profile.displayName,
      sellerName: 'Maria',
      status: 'pending',
      realValue:
        input.offerAmount ??
        primaryTradeCoin?.estimatedValue ??
        catalog.find((coin) => coin.id === input.offerCoinId)?.estimatedValue ??
        0,
      unreadCount: 1,
      messages: [
        {
          id: `msg-${Date.now()}`,
          userId: profile.id,
          displayName: profile.displayName,
          body: firstMessageBody,
          sentAt: new Date().toISOString(),
        },
      ],
    });

    const updatedNegotiations = [...this.negotiationsSubject.value, thread];
    this.negotiationsSubject.next(updatedNegotiations);
    await this.persistNegotiation(thread);

    return thread;
  }

  /**
   * Appends a new message to a negotiation thread and stores it in Firestore.
   * Changes will be synced in real-time to all clients via onSnapshot.
   */
  async addNegotiationMessage(
    threadId: string,
    body: string,
  ): Promise<void> {
    const profile = await this.resolveCurrentProfile();
    const thread = this.getNegotiationById(threadId);

    if (!thread || !body.trim()) {
      return;
    }

    const message: NegotiationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: profile.id,
      displayName: profile.displayName,
      body: body.trim(),
      sentAt: new Date().toISOString(),
    };

    const updatedThread: NegotiationThread = {
      ...thread,
      unreadCount: thread.unreadCount + 1,
      messages: [...thread.messages, message],
    };

    await this.persistNegotiation(updatedThread);
    // Note: The local subject will be updated automatically via onSnapshot listener
  }

  /**
   * Accepts a trade and updates the linked offer state to traded.
   */
  async markNegotiationAsTraded(threadId: string): Promise<void> {
    const targetThread = this.getNegotiationById(threadId);

    if (!targetThread) {
      return;
    }

    const profile = await this.resolveCurrentProfile();

    const updatedOffers: Offer[] = this.offersSubject.value.map((offer) =>
      offer.id === targetThread.offerId
        ? { ...offer, status: 'traded' }
        : offer,
    );
    const updatedNegotiations: NegotiationThread[] =
      this.negotiationsSubject.value.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              status: 'traded',
              unreadCount: 0,
              messages: [
                ...thread.messages,
                {
                  id: `msg-${Date.now()}`,
                  userId: 'system',
                  displayName: 'Sistema',
                  body: 'Estado atualizado automaticamente para Trocado.',
                  sentAt: new Date().toISOString(),
                },
              ],
            }
          : thread,
      );

    this.offersSubject.next(updatedOffers);
    this.negotiationsSubject.next(updatedNegotiations);
    const updatedOffer = updatedOffers.find(
      (offer) => offer.id === targetThread.offerId,
    );
    const updatedThread = updatedNegotiations.find(
      (thread) => thread.id === threadId,
    );

    await Promise.all([
      updatedOffer ? this.persistOffer(updatedOffer) : Promise.resolve(),
      updatedThread
        ? this.persistNegotiation(updatedThread)
        : Promise.resolve(),
    ]);
  }

  private async resolveCurrentProfile(): Promise<{
    id: string;
    displayName: string;
  }> {
    await this.authService.ensureInitialized();

    const profile = this.authService.currentProfileSnapshot;

    return {
      id: profile?.id ?? 'anonymous-user',
      displayName: profile?.displayName ?? 'Visitante',
    };
  }

  /**
   * Starts a real-time listener on the offers Firestore collection.
   */
  private startOffersListener(): void {
    this.offersUnsubscribe = onSnapshot(
      collection(this.firestore, OFFERS_COLLECTION),
      (snapshot) => {
        const remoteOffers: Offer[] = snapshot.docs.map((item) =>
          mapOfferFromFirestore(item.id, item.data() as FirestoreOfferDto),
        );
        const remoteIds = new Set(remoteOffers.map((o) => o.id));
        // Merge any local offers not yet persisted to Firestore
        const localPending = this.offersSubject.value.filter(
          (o) => !remoteIds.has(o.id),
        );
        this.offersSubject.next([...remoteOffers, ...localPending]);
      },
      (error) => {
        console.error('Erro no listener de ofertas:', error);
      },
    );
  }

  private startNegotiationsListener(): void {
    this.negotiationsUnsubscribe = onSnapshot(
      collection(this.firestore, NEGOTIATIONS_COLLECTION),
      (snapshot) => {
        const remoteThreads: NegotiationThread[] = snapshot.docs.map((item) =>
          mapNegotiationThreadFromFirestore(
            item.id,
            item.data() as FirestoreNegotiationThreadDto,
          ),
        );
        const remoteIds = new Set(remoteThreads.map((t) => t.id));
        // Merge any local threads not yet persisted to Firestore
        const localPending = this.negotiationsSubject.value.filter(
          (t) => !remoteIds.has(t.id),
        );
        this.negotiationsSubject.next([...remoteThreads, ...localPending]);
      },
      (error) => {
        console.error('Erro no listener de negociações:', error);
      },
    );
  }

  private unsubscribeAll(): void {
    if (this.negotiationsUnsubscribe) {
      this.negotiationsUnsubscribe();
      this.negotiationsUnsubscribe = null;
    }
    if (this.offersUnsubscribe) {
      this.offersUnsubscribe();
      this.offersUnsubscribe = null;
    }
  }

  private async loadOffersFromFirestore(): Promise<Offer[]> {
    const snapshot = await getDocs(
      collection(this.firestore, OFFERS_COLLECTION),
    );

    return snapshot.docs.map((item) =>
      mapOfferFromFirestore(item.id, item.data() as FirestoreOfferDto),
    );
  }

  private async loadNegotiationsFromFirestore(): Promise<NegotiationThread[]> {
    const snapshot = await getDocs(
      collection(this.firestore, NEGOTIATIONS_COLLECTION),
    );

    return snapshot.docs.map((item) =>
      mapNegotiationThreadFromFirestore(
        item.id,
        item.data() as FirestoreNegotiationThreadDto,
      ),
    );
  }

  private async persistOffer(offer: Offer): Promise<void> {
    const offerRef = doc(this.firestore, OFFERS_COLLECTION, offer.id);
    // Strip dataUrl from photos before persisting to Firestore,
    // as base64 strings can exceed the 1MB document size limit.
    // Photos are kept in memory for the current session.
    const firestoreData = mapOfferToFirestore(offer);
    const sanitizedData = {
      ...firestoreData,
      photos: firestoreData.photos.map((photo) => ({
        kind: photo.kind,
        label: photo.label,
        dataUrl: '', // dataUrl is too large for Firestore
        brightness: photo.brightness,
      })),
    };
    await setDoc(offerRef, sanitizedData);
  }

  private async persistNegotiation(thread: NegotiationThread): Promise<void> {
    const negotiationRef = doc(
      this.firestore,
      NEGOTIATIONS_COLLECTION,
      thread.id,
    );
    await setDoc(negotiationRef, mapNegotiationThreadToFirestore(thread));
  }
}