import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';

import { Coin } from '../../core/models/coin.model';
import { ContentService } from '../../core/services/content.service';
import { MarketplaceService } from '../../core/services/marketplace.service';

type ProposalType = 'money' | 'trade' | 'both';

@Component({
  selector: 'app-make-offer',
  templateUrl: './make-offer.page.html',
  styleUrls: ['./make-offer.page.scss'],
  standalone: false,
})
export class MakeOfferPage implements OnInit, OnDestroy {
  coins: Coin[] = [];
  selectedCoin?: Coin;
  sourceTab = 'inicio';
  supportsTrade = false;
  offerType: ProposalType = 'money';
  offerAmount = '';
  message = '';
  selectedTradeCoinIds: string[] = [];
  ownedCoins: Coin[] = [];
  isProposalSubmitting = false;
  activeCurrency: 'EUR' | 'USD' | 'JPY' | 'BRL' = 'EUR';
  currencySymbol = '€';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly contentService: ContentService,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();
    this.coins = await firstValueFrom(this.contentService.coins$);

    this.marketplaceService.activeCurrency$
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => {
        this.activeCurrency = c;
        const symbols: Record<string, string> = { EUR: '€', USD: '$', JPY: '¥', BRL: 'R$' };
        this.currencySymbol = symbols[c];
      });

    const requestedCoinId = this.activatedRoute.snapshot.queryParamMap.get('coinId');
    this.sourceTab = this.activatedRoute.snapshot.queryParamMap.get('from') ?? this.sourceTab;

    if (requestedCoinId) {
      this.setupProposalMode(requestedCoinId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get proposalPriceLabel(): string {
    if (!this.selectedCoin) return '';
    return this.marketplaceService.formatCurrency(this.selectedCoin.estimatedValue, this.activeCurrency);
  }

  get canSubmitProposal(): boolean {
    if (this.offerType === 'money') {
      return this.hasOfferAmount;
    }
    if (this.offerType === 'trade') {
      return this.selectedTradeCoinIds.length > 0;
    }
    return this.hasOfferAmount || this.selectedTradeCoinIds.length > 0;
  }

  get hasOfferAmount(): boolean {
    return Number(this.offerAmount) > 0;
  }

  get selectedTradeCoins(): Coin[] {
    return this.ownedCoins.filter((coin) =>
      this.selectedTradeCoinIds.includes(coin.id),
    );
  }

  goBack(): void {
    if (!this.selectedCoin) {
      void this.router.navigate(['/tabs/tab1']);
      return;
    }
    void this.router.navigate(['/coin', this.selectedCoin.id], {
      queryParams: { from: this.sourceTab },
    });
  }

  setOfferType(type: ProposalType): void {
    this.offerType = type;
  }

  toggleTradeCoinSelection(coinId: string): void {
    this.selectedTradeCoinIds = this.selectedTradeCoinIds.includes(coinId)
      ? this.selectedTradeCoinIds.filter((id) => id !== coinId)
      : [...this.selectedTradeCoinIds, coinId];
  }

  async submitProposal(): Promise<void> {
    if (!this.selectedCoin || !this.canSubmitProposal) {
      return;
    }

    this.isProposalSubmitting = true;

    try {
      const thread = await this.marketplaceService.createProposal({
        offerCoinId: this.selectedCoin.id,
        proposedCoinIds:
          this.offerType === 'money' ? [] : this.selectedTradeCoinIds,
        offerAmount:
          this.offerType === 'trade' ? undefined : Number(this.offerAmount),
        message: this.message.trim(),
      });

      await this.router.navigate(['/negotiation', thread.id], {
        queryParams: { from: this.sourceTab },
      });
    } finally {
      this.isProposalSubmitting = false;
    }
  }

  getTradeCoinValue(coin: Coin): string {
    return this.marketplaceService.formatCurrency(coin.estimatedValue, this.activeCurrency);
  }

  private async setupProposalMode(coinId: string): Promise<void> {
    this.selectedCoin = this.coins.find((coin) => coin.id === coinId);

    if (!this.selectedCoin) {
      void this.router.navigate(['/tabs/tab1']);
      return;
    }

    this.ownedCoins = this.coins
      .filter((coin) => coin.id !== coinId)
      .slice(0, 3);

    const inventoryCards = await firstValueFrom(
      this.marketplaceService.inventoryCards$,
    );
    const currentCard = inventoryCards.find((item) => item.coin.id === coinId);
    this.supportsTrade = !!currentCard?.lastOffer?.availableForTrade;
    this.offerType = this.supportsTrade ? 'trade' : 'money';
  }
}