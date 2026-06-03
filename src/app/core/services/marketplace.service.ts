import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  setDoc,
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

const OFFERS_COLLECTION = 'offers';
const NEGOTIATIONS_COLLECTION = 'negotiations';

/**
 * Coordinates inventory, offers and negotiations using Firestore.
 */
@Injectable({
  providedIn: 'root',
})
export class MarketplaceService {
  private readonly offersSubject = new BehaviorSubject<Offer[]>([]);
  private readonly negotiationsSubject = new BehaviorSubject<
    NegotiationThread[]
  >([]);
  private isInitialized = false;

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
  ) {}

  /**
   * Loads offers and negotiations from Firestore on first access.
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
   * Returns a single negotiation thread from persisted state.
   */
  getNegotiationById(threadId: string): NegotiationThread | undefined {
    return this.negotiationsSubject.value.find(
      (thread) => thread.id === threadId,
    );
  }

  /**
   * Creates a new offer and stores it locally.
   */
  async publishOffer(input: {
    coinId: string;
    quantity: number;
    askPrice: number;
    description: string;
    availableForTrade: boolean;
    photos: OfferPhoto[];
  }): Promise<Offer> {
    const profile = await this.resolveCurrentProfile();
    const offerId = `offer-${Date.now()}`;
    const offer: Offer = new OfferModel({
      id: offerId,
      coinId: input.coinId,
      quantity: input.quantity,
      askPrice: input.askPrice,
      description: input.description,
      availableForTrade: input.availableForTrade,
      photos: input.photos,
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
          author: 'Carlos',
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
    await Promise.all([
      this.persistOffer(offer),
      this.persistNegotiation(nextNegotiation),
    ]);

    return offer;
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
          author: 'Carlos',
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
   * Appends a new message to a negotiation thread and stores it locally.
   */
  async addNegotiationMessage(
    threadId: string,
    author: NegotiationMessage['author'],
    body: string,
  ): Promise<void> {
    let updatedThread: NegotiationThread | undefined;
    const updatedNegotiations = this.negotiationsSubject.value.map((thread) => {
      if (thread.id !== threadId) {
        return thread;
      }

      updatedThread = {
        ...thread,
        unreadCount:
          author === 'Carlos' ? thread.unreadCount + 1 : thread.unreadCount,
        messages: [
          ...thread.messages,
          {
            id: `msg-${Date.now()}`,
            author,
            body,
            sentAt: new Date().toISOString(),
          },
        ],
      };

      return updatedThread;
    });

    this.negotiationsSubject.next(updatedNegotiations);

    if (updatedThread) {
      await this.persistNegotiation(updatedThread);
    }
  }

  /**
   * Accepts a trade and updates the linked offer state to traded.
   */
  async markNegotiationAsTraded(threadId: string): Promise<void> {
    const targetThread = this.getNegotiationById(threadId);

    if (!targetThread) {
      return;
    }

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
                  author: 'Sistema',
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

  private async resolveCurrentProfile(): Promise<{ displayName: string }> {
    await this.authService.ensureInitialized();

    return {
      displayName:
        this.authService.currentProfileSnapshot?.displayName ?? 'Carlos',
    };
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
    await setDoc(offerRef, mapOfferToFirestore(offer));
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
