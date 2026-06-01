import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';

import { AppStrings } from '../core/models/app-strings.model';
import { Coin, Offer } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';
import { StringsService } from '../core/services/strings.service';

type InventoryCard = { coin: Coin; lastOffer?: Offer };
type RecentInventoryCard = InventoryCard & { timeLabel: string };

const EUR_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  readonly inventoryCards$ = this.marketplaceService.inventoryCards$;
  readonly strings$: Observable<AppStrings> = this.stringsService.strings$;
  readonly featuredCoins$: Observable<InventoryCard[]> =
    this.inventoryCards$.pipe(map((cards) => cards.slice(0, 4)));
  readonly recentlyAdded$: Observable<RecentInventoryCard[]> =
    this.inventoryCards$.pipe(
      map((cards) =>
        [...cards]
          .reverse()
          .slice(0, 2)
          .map((card, index) => ({
            ...card,
            timeLabel: index === 0 ? 'Há 2 horas' : 'Há 5 horas',
          })),
      ),
    );
  readonly summary$ = combineLatest([
    this.inventoryCards$,
    this.marketplaceService.offers$,
  ]).pipe(
    map(([cards, offers]) => ({
      availableCount: cards.length,
      tradeCount: offers.filter((offer) => offer.availableForTrade).length,
    })),
  );

  constructor(
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
    private readonly stringsService: StringsService,
  ) {}

  openCoin(coin: Coin): void {
    void this.router.navigate(['/coin', coin.id], {
      queryParams: {
        from: 'inventario',
      },
    });
  }

  openAddOffer(): void {
    void this.router.navigate(['/tabs/tab2']);
  }

  openNegotiations(): void {
    void this.router.navigate(['/tabs/tab3']);
  }

  getPriceLabel(item: InventoryCard): string {
    if (item.lastOffer?.availableForTrade) {
      return 'Troca';
    }

    return EUR_FORMATTER.format(
      item.lastOffer?.askPrice ?? item.coin.estimatedValue,
    );
  }

  isTrade(item: InventoryCard): boolean {
    return !!item.lastOffer?.availableForTrade;
  }

  getOfferStateLabel(offer?: Offer): string {
    if (!offer) {
      return 'Sem oferta publicada';
    }

    if (offer.status === 'traded') {
      return 'Última oferta concluída';
    }

    return 'Oferta pronta a negociar';
  }
}
