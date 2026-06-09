import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  firstValueFrom,
  map,
} from 'rxjs';

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

const LS_OFFERS_KEY = 'ls_offers';
const LS_NEGOTIATIONS_KEY = 'ls_negotiations';

@Injectable({
  providedIn: 'root',
})
export class MarketplaceService {
  private readonly offersSubject = new BehaviorSubject<Offer[]>([]);
  private readonly negotiationsSubject = new BehaviorSubject<NegotiationThread[]>([]);

  private readonly activeUnitSubject = new BehaviorSubject<'g' | 'oz'>('g');
  private readonly activeCurrencySubject = new BehaviorSubject<'EUR' | 'USD'>('EUR');

  private isInitialized = false;

  readonly offers$ = this.offersSubject.asObservable();
  readonly negotiations$ = this.negotiationsSubject.asObservable();
  readonly catalog$ = this.contentService.coins$;

  readonly activeUnit$ = this.activeUnitSubject.asObservable();
  readonly activeCurrency$ = this.activeCurrencySubject.asObservable();

  readonly inventoryCards$: Observable<
    Array<{ coin: Coin; lastOffer?: Offer; customDisplayPrice?: string }>
  > = combineLatest([this.catalog$, this.offers$, this.activeUnit$, this.activeCurrency$]).pipe(
    map(([coins, offers, unit, currency]) =>
      coins.map((coin) => {
        const mappedCoin = { ...coin };

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

        const lastOffer = [...offers]
          .reverse()
          .find((offer) => offer.coinId === coin.id);

        let rawPrice = lastOffer?.askPrice ?? coin.estimatedValue;
        let isTradeOption = !!lastOffer?.availableForTrade;
        let formattedPriceLabel = 'Troca';

        if (!isTradeOption) {
          if (currency === 'USD') {
            rawPrice = rawPrice * 1.08;
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
          customDisplayPrice: formattedPriceLabel,
        };
      }),
    ),
  );

  constructor(
    private readonly authService: AuthService,
    private readonly contentService: ContentService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const [storedOffers, storedNegotiations] = await Promise.all([
      this.localStorageService.getItem<Offer[]>(LS_OFFERS_KEY),
      this.localStorageService.getItem<NegotiationThread[]>(LS_NEGOTIATIONS_KEY),
    ]);

    this.offersSubject.next(OfferModel.fromJsonArray(storedOffers ?? []));
    this.negotiationsSubject.next(
      NegotiationThreadModel.fromJsonArray(storedNegotiations ?? []),
    );
    this.isInitialized = true;
  }

  updateActiveUnit(unit: 'g' | 'oz'): void {
    this.activeUnitSubject.next(unit);
  }

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

      await this.localStorageService.setItem(
        `offer_photos_${offerId}`,
        input.photos,
      );

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

      await this.persistOffers(updatedOffers);
      await this.persistNegotiations(updatedNegotiations);

      return offer;
    } catch (err) {
      console.error('[publishOffer] FAILED:', err);
      throw new Error('Não foi possível publicar a oferta.');
    }
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
    await this.persistNegotiations(updatedNegotiations);

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

    const updatedNegotiations = this.negotiationsSubject.value.map((t) =>
      t.id === threadId ? updatedThread : t,
    );

    this.negotiationsSubject.next(updatedNegotiations);
    await this.persistNegotiations(updatedNegotiations);
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

    await Promise.all([
      this.persistOffers(updatedOffers),
      this.persistNegotiations(updatedNegotiations),
    ]);
  }

  private async resolveCurrentProfile(): Promise<{ id: string; displayName: string }> {
    await this.authService.ensureInitialized();
    const profile = this.authService.currentProfileSnapshot;
    return {
      id: profile?.id ?? 'anonymous-user',
      displayName: profile?.displayName ?? 'Visitante',
    };
  }

  private async persistOffers(offers: Offer[]): Promise<void> {
    const plain = offers.map((o) => ({
      id: o.id,
      coinId: o.coinId,
      ownerId: o.ownerId,
      ownerDisplayName: o.ownerDisplayName,
      title: o.title,
      quantity: o.quantity,
      askPrice: o.askPrice,
      description: o.description,
      era: o.era,
      condition: o.condition,
      realValue: o.realValue,
      availableForTrade: o.availableForTrade,
      photos: (o.photos ?? []).map((p) => ({
        kind: p.kind,
        label: p.label,
        dataUrl: '',
        brightness: p.brightness,
      })),
      status: o.status,
      createdAt: o.createdAt,
    }));
    await this.localStorageService.setItem(LS_OFFERS_KEY, plain);
  }

  private async persistNegotiations(threads: NegotiationThread[]): Promise<void> {
    await this.localStorageService.setItem(LS_NEGOTIATIONS_KEY, threads);
  }
}
