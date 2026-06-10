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

const PLACEHOLDER_IMAGE = 'assets/icon/coin-aureus.svg';

const ERA_LABELS: Record<string, string> = {
  romano: 'Império Romano',
  grego: 'Grécia Antiga',
  portugues: 'Portugal',
  bizantino: 'Império Bizantino',
};

@Injectable({
  providedIn: 'root',
})
export class MarketplaceService {
  private readonly offersSubject = new BehaviorSubject<Offer[]>([]);
  private readonly negotiationsSubject = new BehaviorSubject<NegotiationThread[]>([]);

  private readonly activeUnitSubject = new BehaviorSubject<'g' | 'oz'>('g');
  private readonly activeCurrencySubject = new BehaviorSubject<'EUR' | 'USD' | 'JPY' | 'BRL'>('EUR');

  private isInitialized = false;

  readonly offers$ = this.offersSubject.asObservable();
  readonly negotiations$ = this.negotiationsSubject.asObservable();
  readonly catalog$ = this.contentService.coins$;

  readonly activeUnit$ = this.activeUnitSubject.asObservable();
  readonly activeCurrency$ = this.activeCurrencySubject.asObservable();

  readonly inventoryCards$: Observable<
    Array<{ coin: Coin; lastOffer?: Offer; customDisplayPrice?: string }>
  > = combineLatest([this.catalog$, this.offers$, this.activeUnit$, this.activeCurrency$]).pipe(
    map(([coins, offers, unit, currency]) => {
      const formatPrice = (price: number, isTradeOption: boolean): string => {
        if (isTradeOption) return 'Troca';
        return this.formatCurrency(price, currency);
      };

      const applyWeightUnit = (coin: Coin): Coin => {
        if (!coin.weight) return coin;
        const numericWeight = parseFloat(coin.weight);
        if (isNaN(numericWeight)) return coin;
        const weight = unit === 'oz'
          ? `${(numericWeight * 0.035274).toFixed(2)} oz`
          : `${numericWeight.toFixed(1)}g`;
        return { ...coin, weight };
      };

      const catalogCoinIds = new Set(coins.map((c) => c.id));
      const catalogCards = coins.map((coin) => {
        const mappedCoin = applyWeightUnit(coin);
        const lastOffer = [...offers].reverse().find((o) => o.coinId === coin.id);
        const rawPrice = lastOffer?.askPrice ?? coin.estimatedValue;
        return {
          coin: mappedCoin,
          lastOffer,
          customDisplayPrice: formatPrice(rawPrice, !!lastOffer?.availableForTrade),
        };
      });

      const standaloneOffers = offers.filter((o) => !catalogCoinIds.has(o.coinId));
      const standaloneCards = standaloneOffers.map((offer) => {
        const obversePhoto = offer.photos?.find((p) => p.kind === 'obverse');
        const reversePhoto = offer.photos?.find((p) => p.kind === 'reverse');
        const edgePhoto = offer.photos?.find((p) => p.kind === 'edge');
        const photoUrl = obversePhoto?.dataUrl || offer.photos?.[0]?.dataUrl || PLACEHOLDER_IMAGE;
        const eraLabel = ERA_LABELS[offer.era] || offer.era || '';
        const virtualCoin: Coin = {
          id: offer.coinId,
          name: offer.title || 'Moeda personalizada',
          sellerName: offer.ownerDisplayName || '',
          emperor: eraLabel,
          period: eraLabel,
          material: offer.material || '',
          conservation: offer.condition || '',
          location: offer.location || '',
          origin: offer.origin,
          weight: offer.weight,
          diameter: offer.diameter,
          estimatedValue: offer.realValue || offer.askPrice || 0,
          description: offer.description || '',
          history: offer.history,
          reference: offer.reference,
          image: photoUrl,
          images: {
            obverse: obversePhoto?.dataUrl || photoUrl,
            reverse: reversePhoto?.dataUrl || photoUrl,
            edge: edgePhoto?.dataUrl || photoUrl,
          },
          tags: [],
        };
        return {
          coin: virtualCoin,
          lastOffer: offer,
          customDisplayPrice: formatPrice(offer.askPrice, offer.availableForTrade),
        };
      });

      return [...catalogCards, ...standaloneCards];
    }),
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

    const offersWithPhotos = await Promise.all(
      (storedOffers ?? []).map(async (offer) => {
        const photos = await this.localStorageService.getItem<OfferPhoto[]>(
          `offer_photos_${offer.id}`,
        );
        return { ...offer, photos: photos ?? offer.photos ?? [] };
      }),
    );

    this.offersSubject.next(OfferModel.fromJsonArray(offersWithPhotos));

    const mergedNegotiations = this.mergeThreadsByPerson(
      NegotiationThreadModel.fromJsonArray(storedNegotiations ?? []),
    );
    this.negotiationsSubject.next(mergedNegotiations);

    if (mergedNegotiations.length !== (storedNegotiations ?? []).length) {
      await this.persistNegotiations(mergedNegotiations);
    }

    this.isInitialized = true;
  }

  updateActiveUnit(unit: 'g' | 'oz'): void {
    this.activeUnitSubject.next(unit);
  }

  updateActiveCurrency(currency: 'EUR' | 'USD' | 'JPY' | 'BRL'): void {
    this.activeCurrencySubject.next(currency);
  }

  formatCurrency(value: number, currency: 'EUR' | 'USD' | 'JPY' | 'BRL'): string {
    const rates: Record<string, number> = { EUR: 1, USD: 1.08, JPY: 160, BRL: 5.5 };
    const locales: Record<string, string> = { EUR: 'pt-PT', USD: 'en-US', JPY: 'ja-JP', BRL: 'pt-BR' };
    return new Intl.NumberFormat(locales[currency], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value * rates[currency]);
  }

  async getCoinById(coinId: string): Promise<Coin | undefined> {
    const catalog = await firstValueFrom(this.catalog$);
    const catalogCoin = catalog.find((coin) => coin.id === coinId);
    if (catalogCoin) return catalogCoin;

    // Procurar em moedas virtuais (adicionadas pelo utilizador)
    const cards = await firstValueFrom(this.inventoryCards$);
    return cards.find((item) => item.coin.id === coinId)?.coin;
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
    weight?: string;
    diameter?: string;
    material?: string;
    origin?: string;
    history?: string;
    reference?: string;
    location?: string;
  }): Promise<Offer> {
    try {
      const profile = await this.resolveCurrentProfile();
      const offerId = `offer-${Date.now()}`;

      await this.localStorageService.setItem(`offer_photos_${offerId}`, input.photos);

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
        photos: input.photos,
        status: 'negotiating',
        createdAt: new Date().toISOString(),
        weight: input.weight,
        diameter: input.diameter,
        material: input.material,
        origin: input.origin,
        history: input.history,
        reference: input.reference,
        location: input.location,
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
        proposerName: 'Comprador',
        proposerId: 'unknown-proposer',
        sellerName: profile.displayName,
        sellerId: profile.id,
        status: 'pending',
        realValue: proposerCoin?.estimatedValue ?? input.askPrice,
        unreadCount: 1,
        messages: [
          {
            id: `msg-${Date.now()}`,
            userId: 'unknown-proposer',
            displayName: 'Comprador',
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
        ? `Proponho ${this.formatCurrency(input.offerAmount, this.activeCurrencySubject.value)}`
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

    const offerCoin = catalog.find((coin) => coin.id === input.offerCoinId);
    const sellerName = offerCoin?.sellerName ?? 'Vendedor';
    const sellerId = `seller-${input.offerCoinId}`;

    // Reutilizar o chat existente com o mesmo vendedor, em vez de abrir um novo.
    const existingThread = this.negotiationsSubject.value.find(
      (t) => t.proposerId === profile.id && t.sellerId === sellerId,
    );

    if (existingThread) {
      const proposalMessage: NegotiationMessage = {
        id: `msg-${Date.now()}`,
        userId: profile.id,
        displayName: profile.displayName,
        body: firstMessageBody,
        sentAt: new Date().toISOString(),
      };

      const updatedThread: NegotiationThread = {
        ...existingThread,
        unreadCount: existingThread.unreadCount + 1,
        messages: [...existingThread.messages, proposalMessage],
      };

      const updatedNegotiations = this.negotiationsSubject.value.map((t) =>
        t.id === existingThread.id ? updatedThread : t,
      );
      this.negotiationsSubject.next(updatedNegotiations);
      await this.persistNegotiations(updatedNegotiations);

      return updatedThread;
    }

    const thread: NegotiationThread = new NegotiationThreadModel({
      id: `thread-${Date.now()}`,
      offerId: `proposal-${Date.now()}`,
      offerCoinId: input.offerCoinId,
      proposerCoinId: primaryTradeCoin?.id ?? input.offerCoinId,
      proposerName: profile.displayName,
      proposerId: profile.id,
      sellerName,
      sellerId,
      status: 'pending',
      realValue:
        input.offerAmount ??
        primaryTradeCoin?.estimatedValue ??
        offerCoin?.estimatedValue ??
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

  async removeOffer(offerId: string): Promise<void> {
    const updatedOffers = this.offersSubject.value.filter((o) => o.id !== offerId);
    const updatedNegotiations = this.negotiationsSubject.value.filter(
      (t) => t.offerId !== offerId,
    );

    this.offersSubject.next(updatedOffers);
    this.negotiationsSubject.next(updatedNegotiations);

    await Promise.all([
      this.persistOffers(updatedOffers),
      this.persistNegotiations(updatedNegotiations),
      this.localStorageService.setItem(`offer_photos_${offerId}`, null),
    ]);
  }

  async updateOffer(
    offerId: string,
    input: {
      title: string;
      quantity: number;
      askPrice: number;
      description: string;
      era: string;
      condition: string;
      realValue: number;
      availableForTrade: boolean;
      photos: OfferPhoto[];
      weight?: string;
      diameter?: string;
      material?: string;
      origin?: string;
      history?: string;
      reference?: string;
      location?: string;
    },
  ): Promise<void> {
    await this.localStorageService.setItem(`offer_photos_${offerId}`, input.photos);

    const updatedOffers = this.offersSubject.value.map((o) => {
      if (o.id !== offerId) return o;
      return new OfferModel({
        ...o,
        title: input.title,
        quantity: input.quantity,
        askPrice: input.askPrice,
        description: input.description,
        era: input.era,
        condition: input.condition,
        realValue: input.realValue,
        availableForTrade: input.availableForTrade,
        photos: input.photos,
        weight: input.weight,
        diameter: input.diameter,
        material: input.material,
        origin: input.origin,
        history: input.history,
        reference: input.reference,
        location: input.location,
      });
    });

    this.offersSubject.next(updatedOffers);
    await this.persistOffers(updatedOffers);
  }

  async acceptProposal(threadId: string): Promise<void> {
    const targetThread = this.getNegotiationById(threadId);

    if (!targetThread || targetThread.status !== 'pending') {
      return;
    }

    const updatedNegotiations: NegotiationThread[] =
      this.negotiationsSubject.value.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              status: 'accepted' as const,
              messages: [
                ...thread.messages,
                {
                  id: `msg-${Date.now()}`,
                  userId: 'system',
                  displayName: 'Sistema',
                  body: `${targetThread.sellerName} aceitou a proposta. Confirme a troca para concluir.`,
                  sentAt: new Date().toISOString(),
                },
              ],
            }
          : thread,
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

  async startContactThread(coinId: string, coinName: string, sellerName: string): Promise<NegotiationThread> {
    const existing = this.negotiationsSubject.value.find((t) => t.offerCoinId === coinId);
    if (existing) return existing;

    const profile = await this.resolveCurrentProfile();
    const thread = new NegotiationThreadModel({
      id: `thread-${Date.now()}`,
      offerId: `catalog-${coinId}`,
      offerCoinId: coinId,
      proposerCoinId: coinId,
      proposerName: profile.displayName,
      sellerName: sellerName || 'Vendedor',
      status: 'pending',
      realValue: 0,
      unreadCount: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          userId: profile.id,
          displayName: profile.displayName,
          body: `Olá! Tenho interesse na moeda "${coinName}". Podemos conversar?`,
          sentAt: new Date().toISOString(),
        },
      ],
    });

    const updated = [...this.negotiationsSubject.value, thread];
    this.negotiationsSubject.next(updated);
    await this.persistNegotiations(updated);
    return thread;
  }

  private mergeThreadsByPerson(threads: NegotiationThread[]): NegotiationThread[] {
    const groups = new Map<string, NegotiationThread[]>();

    for (const thread of threads) {
      const key = `${thread.proposerName}|${thread.sellerName}`;
      const group = groups.get(key) ?? [];
      group.push(thread);
      groups.set(key, group);
    }

    const merged: NegotiationThread[] = [];

    for (const group of groups.values()) {
      if (group.length === 1) {
        merged.push(group[0]);
        continue;
      }

      const base = group[0];
      const allMessages = ([] as NegotiationMessage[])
        .concat(...group.map((t) => t.messages))
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      const totalUnread = group.reduce((sum, t) => sum + t.unreadCount, 0);

      merged.push({ ...base, messages: allMessages, unreadCount: totalUnread });
    }

    return merged;
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
      weight: o.weight,
      diameter: o.diameter,
      material: o.material,
      origin: o.origin,
      history: o.history,
      reference: o.reference,
      location: o.location,
    }));
    await this.localStorageService.setItem(LS_OFFERS_KEY, plain);
  }

  private async persistNegotiations(threads: NegotiationThread[]): Promise<void> {
    await this.localStorageService.setItem(LS_NEGOTIATIONS_KEY, threads);
  }
}
