import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    Observable,
    combineLatest,
    firstValueFrom,
    map,
} from 'rxjs';

import {
    Coin,
    NegotiationMessage,
    NegotiationThread,
    Offer,
    OfferPhoto,
} from '../models/coin.model';
import { ContentService } from './content.service';
import { LocalStorageService } from './local-storage.service';

const OFFERS_STORAGE_KEY = 'ancient-coins-offers';
const NEGOTIATIONS_STORAGE_KEY = 'ancient-coins-negotiations';

/**
 * Coordinates inventory, offers and negotiations using JSON seeds plus local storage.
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
    private readonly contentService: ContentService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  /**
   * Loads persisted data and falls back to JSON seeds on the first application start.
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const [storedOffers, storedNegotiations, seededNegotiations] =
      await Promise.all([
        this.localStorageService.getItem<Offer[]>(OFFERS_STORAGE_KEY),
        this.localStorageService.getItem<NegotiationThread[]>(
          NEGOTIATIONS_STORAGE_KEY,
        ),
        firstValueFrom(this.contentService.negotiationSeeds$),
      ]);

    this.offersSubject.next(storedOffers ?? []);
    this.negotiationsSubject.next(storedNegotiations ?? seededNegotiations);
    this.isInitialized = true;
  }

  /**
   * Returns a single coin from the JSON catalog.
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
    const offerId = `offer-${Date.now()}`;
    const offer: Offer = {
      id: offerId,
      coinId: input.coinId,
      quantity: input.quantity,
      askPrice: input.askPrice,
      description: input.description,
      availableForTrade: input.availableForTrade,
      photos: input.photos,
      status: 'negotiating',
      createdAt: new Date().toISOString(),
    };

    const updatedOffers = [...this.offersSubject.value, offer];
    const catalog = await firstValueFrom(this.catalog$);
    const proposerCoin =
      catalog.find((coin) => coin.id !== input.coinId) ?? catalog[0];
    const nextNegotiation: NegotiationThread = {
      id: `thread-${Date.now()}`,
      offerId,
      offerCoinId: input.coinId,
      proposerCoinId: proposerCoin?.id ?? input.coinId,
      proposerName: 'Carlos',
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
    };
    const updatedNegotiations = [
      ...this.negotiationsSubject.value,
      nextNegotiation,
    ];

    this.offersSubject.next(updatedOffers);
    this.negotiationsSubject.next(updatedNegotiations);
    await this.localStorageService.setItem(OFFERS_STORAGE_KEY, updatedOffers);
    await this.localStorageService.setItem(
      NEGOTIATIONS_STORAGE_KEY,
      updatedNegotiations,
    );

    return offer;
  }

  /**
   * Appends a new message to a negotiation thread and stores it locally.
   */
  async addNegotiationMessage(
    threadId: string,
    author: NegotiationMessage['author'],
    body: string,
  ): Promise<void> {
    const updatedNegotiations = this.negotiationsSubject.value.map((thread) => {
      if (thread.id !== threadId) {
        return thread;
      }

      return {
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
    });

    this.negotiationsSubject.next(updatedNegotiations);
    await this.localStorageService.setItem(
      NEGOTIATIONS_STORAGE_KEY,
      updatedNegotiations,
    );
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
    await Promise.all([
      this.localStorageService.setItem(OFFERS_STORAGE_KEY, updatedOffers),
      this.localStorageService.setItem(
        NEGOTIATIONS_STORAGE_KEY,
        updatedNegotiations,
      ),
    ]);
  }
}
