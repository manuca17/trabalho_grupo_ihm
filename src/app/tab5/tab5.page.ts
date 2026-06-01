import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';

import { Coin, Offer } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';

type InventoryCard = { coin: Coin; lastOffer?: Offer };

const EUR_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: false,
})
export class Tab5Page {
  readonly activeSection$: Observable<'home' | 'profile'> =
    this.activatedRoute.queryParamMap.pipe(
      map((params) => (params.get('nav') === 'profile' ? 'profile' : 'home')),
    );
  readonly inventoryCards$ = this.marketplaceService.inventoryCards$;
  readonly featuredCoins$ = this.inventoryCards$.pipe(
    map((cards) => cards.slice(0, 4)),
  );
  readonly recentlyAdded$ = this.inventoryCards$.pipe(
    map((cards) =>
      [...cards]
        .reverse()
        .slice(0, 2)
        .map((item, index) => ({
          ...item,
          timeLabel: index === 0 ? 'Ha 2 horas' : 'Ha 5 horas',
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
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  openCoin(coin: Coin): void {
    void this.router.navigate(['/coin', coin.id], {
      queryParams: { from: 'inicio' },
    });
  }

  openAddOffer(): void {
    void this.router.navigate(['/tabs/tab2']);
  }

  openMessages(): void {
    void this.router.navigate(['/tabs/tab4']);
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
}
