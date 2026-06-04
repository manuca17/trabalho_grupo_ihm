import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { Coin, Offer } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';
import { StringsService } from '../core/services/strings.service';

// Interface atualizada para reconhecer a propriedade vinda do serviço
type InventoryCard = { coin: Coin; lastOffer?: Offer; customDisplayPrice?: string };
type RecentInventoryCard = InventoryCard & { timeLabel: string };

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  readonly inventoryCards$ = this.marketplaceService.inventoryCards$;

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

  readonly summary$ = this.inventoryCards$.pipe(
    map((cards) => ({
      availableCount: cards.length,
      tradeCount: cards.filter((item) => item.lastOffer?.availableForTrade).length,
    })),
  );

  constructor(
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
    private readonly stringsService: StringsService,
  ) {}

  openCoin(coin: Coin): void {
    void this.router.navigate(['/coin', coin.id], { queryParams: { from: 'inicio' } });
  }

  openAddOffer(): void { void this.router.navigate(['/tabs/tab2']); }
  openNegotiations(): void { void this.router.navigate(['/tabs/tab3']); }

  isTrade(item: InventoryCard): boolean { return !!item.lastOffer?.availableForTrade; }

  getOfferStateLabel(offer?: Offer): string {
    if (!offer) return 'Sem oferta publicada';
    if (offer.status === 'traded') return 'Última oferta concluída';
    return 'Oferta pronta a negociar';
  }
}