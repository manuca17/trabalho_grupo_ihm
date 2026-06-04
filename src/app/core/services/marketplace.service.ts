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

const OFFERS_COLLECTION = 'offers';
const NEGOTIATIONS_COLLECTION = 'negotiations';

@Injectable({
  providedIn: 'root',
})
export class MarketplaceService implements OnDestroy {
  private readonly offersSubject = new BehaviorSubject<Offer[]>([]);
  private readonly negotiationsSubject = new BehaviorSubject<NegotiationThread[]>([]);
  
  private readonly activeUnitSubject = new BehaviorSubject<'g' | 'oz'>('g');
  // NOVO: Estado centralizado reativo para controlar a divisa comercial preferida ('EUR' ou 'USD')
  private readonly activeCurrencySubject = new BehaviorSubject<'EUR' | 'USD'>('EUR');

  private isInitialized = false;
  private negotiationsUnsubscribe: Unsubscribe | null = null;
  private offersUnsubscribe: Unsubscribe | null = null;

  readonly offers$ = this.offersSubject.asObservable();
  readonly negotiations$ = this.negotiationsSubject.asObservable();
  readonly catalog$ = this.contentService.coins$;
  
  readonly activeUnit$ = this.activeUnitSubject.asObservable();
  // NOVO: Exposição pública do Observable da divisa para os ecrãs subscreverem
  readonly activeCurrency$ = this.activeCurrencySubject.asObservable();

  // ATUALIZADO: Agora escuta a unidade de peso e a moeda comercial, aplicando transformações dinâmicas
  readonly inventoryCards$: Observable<
    Array<{ coin: Coin; lastOffer?: Offer; customDisplayPrice?: string }>
  > = combineLatest([this.catalog$, this.offers$, this.activeUnit$, this.activeCurrency$]).pipe(
    map(([coins, offers, unit, currency]) =>
      coins.map((coin) => {
        const mappedCoin = { ...coin };
        
        // 1. Conversão de Unidade de Peso
        if (unit === 'oz' && mappedCoin.weight) {
          const numericWeight = parseFloat(mappedCoin.weight);
          if (!isNaN(numericWeight)) {
            mappedCoin.weight = `${(numericWeight * 0.035274).toFixed(2)} oz`;
          }
        } else if (unit === 'g' && mappedCoin.weight) {
          const numericWeight = parseFloat(mappedCoin.weight);
          if (!isNaN(numericWeight)) {
            mappedCoin.weight = `${numericWeight.toFixed(1)}g`;
          }
        }

        // 2. Localizar Oferta correspondente
        const lastOffer = [...offers]
          .reverse()
          .find((offer) => offer.coinId === coin.id);

        // 3. Conversão Dinâmica de Moeda (EUR para USD se selecionado)
        let rawPrice = lastOffer?.askPrice ?? coin.estimatedValue;
        let isTradeOption = !!lastOffer?.availableForTrade;
        let formattedPriceLabel = 'Troca';

        if (!isTradeOption) {
          if (currency === 'USD') {
            rawPrice = rawPrice * 1.08; // Taxa de conversão base indicativa
            formattedPriceLabel = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(rawPrice);
          } else {
            formattedPriceLabel = new Intl.NumberFormat('pt-PT', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(rawPrice);
          }
        }

        return {
          coin: mappedCoin,
          lastOffer,
          customDisplayPrice: formattedPriceLabel // Injetado rótulo de preço já formatado reativamente
        };
      }),
    ),
  );

  constructor(
    private readonly authService: AuthService,
    private readonly contentService: ContentService,
    private readonly firestore: Firestore,
  ) {}

  ngOnDestroy(): void {
    this.unsubscribeAll();
  }

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

    this.startNegotiationsListener();
    this.startOffersListener();
  }

  updateActiveUnit(unit: 'g' | 'oz'): void {
    this.activeUnitSubject.next(unit);
  }

  // NOVO MÉTODO: Altera reativamente a divisa preferida na aplicação
  updateActiveCurrency(currency: 'EUR' | 'USD'): void {
    this.activeCurrencySubject.next(currency);
  }

  async getCoinById(coinId: string): Promise<Coin | undefined> {
    const catalog = await firstValueFrom(this.catalog$);
    return catalog.find((coin) => coin.id === coinId);
  }

  getOfferById(offerId: string): Offer | undefined {
    return this.offersSubject.value.find((offer) => offer.id === offerId);
  }

  getNegotiationById(threadId: string): NegotiationThread | undefined {
    return this.negotiationsSubject.value.find(
      (thread) => thread.id === threadId,
    );
  }

  getNegotiationById$(threadId: string): Observable<NegotiationThread | undefined> {
    return this.negotiations$.pipe(
      map((threads) => threads.find((thread) => thread.id === threadId)),
    );
  }

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
      ownerId: profile.id,
      ownerDisplayName: profile.displayName,
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
    await Promise.all([
      this.persistOffer(offer),
      this.persistNegotiation(nextNegotiation),
    ]);

    return offer;
  }

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

  async addNegotiationMessage(threadId: string, body: string): Promise<void> {
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
  }

  async markNegotiationAsTraded(threadId: string): Promise<void> {
    const targetThread = this.getNegotiationById(threadId);

    if (!targetThread) {
      return;
    }

    const updatedOffers: Offer[] = this.offersSubject.value.map((offer) =>
      offer.id === targetThread.offerId ? { ...offer, status: 'traded' } : offer,
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
    const updatedOffer = updatedOffers.find((offer) => offer.id === targetThread.offerId);
    const updatedThread = updatedNegotiations.find((thread) => thread.id === threadId);

    await Promise.all([
      updatedOffer ? this.persistOffer(updatedOffer) : Promise.resolve(),
      updatedThread ? this.persistNegotiation(updatedThread) : Promise.resolve(),
    ]);
  }

  private async resolveCurrentProfile(): Promise<{ id: string; displayName: string; }> {
    await this.authService.ensureInitialized();
    const profile = this.authService.currentProfileSnapshot;
    return {
      id: profile?.id ?? 'anonymous-user',
      displayName: profile?.displayName ?? 'Visitante',
    };
  }

  private startNegotiationsListener(): void {
    this.negotiationsUnsubscribe = onSnapshot(
      collection(this.firestore, NEGOTIATIONS_COLLECTION),
      (snapshot) => {
        const threads: NegotiationThread[] = snapshot.docs.map((item) =>
          mapNegotiationThreadFromFirestore(item.id, item.data() as FirestoreNegotiationThreadDto),
        );
        this.negotiationsSubject.next(threads);
      },
      (error) => { console.error('Erro no listener de negociações:', error); },
    );
  }

  private startOffersListener(): void {
    this.offersUnsubscribe = onSnapshot(
      collection(this.firestore, OFFERS_COLLECTION),
      (snapshot) => {
        const offers: Offer[] = snapshot.docs.map((item) =>
          mapOfferFromFirestore(item.id, item.data() as FirestoreOfferDto),
        );
        this.offersSubject.next(offers);
      },
      (error) => { console.error('Erro no listener de ofertas:', error); },
    );
  }

  private unsubscribeAll(): void {
    if (this.negotiationsUnsubscribe) { this.negotiationsUnsubscribe(); this.negotiationsUnsubscribe = null; }
    if (this.offersUnsubscribe) { this.offersUnsubscribe(); this.offersUnsubscribe = null; }
  }

  private async loadOffersFromFirestore(): Promise<Offer[]> {
    const snapshot = await getDocs(collection(this.firestore, OFFERS_COLLECTION));
    return snapshot.docs.map((item) => mapOfferFromFirestore(item.id, item.data() as FirestoreOfferDto));
  }

  private async loadNegotiationsFromFirestore(): Promise<NegotiationThread[]> {
    const snapshot = await getDocs(collection(this.firestore, NEGOTIATIONS_COLLECTION));
    return snapshot.docs.map((item) => mapNegotiationThreadFromFirestore(item.id, item.data() as FirestoreNegotiationThreadDto));
  }

  private async persistOffer(offer: Offer): Promise<void> {
    const offerRef = doc(this.firestore, OFFERS_COLLECTION, offer.id);
    await setDoc(offerRef, mapOfferToFirestore(offer));
  }

  private async persistNegotiation(thread: NegotiationThread): Promise<void> {
    const negotiationRef = doc(this.firestore, NEGOTIATIONS_COLLECTION, thread.id);
    await setDoc(negotiationRef, mapNegotiationThreadToFirestore(thread));
  }
}