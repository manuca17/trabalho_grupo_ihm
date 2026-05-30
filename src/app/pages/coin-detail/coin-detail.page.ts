import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Coin } from '../../core/models/coin.model';
import { MarketplaceService } from '../../core/services/marketplace.service';

/**
 * Shows the complete coin sheet loaded from the inventory catalog.
 */
@Component({
  selector: 'app-coin-detail',
  templateUrl: './coin-detail.page.html',
  styleUrls: ['./coin-detail.page.scss'],
  standalone: false,
})
export class CoinDetailPage implements OnInit {
  coin?: Coin;
  sourceTab = 'inventario';

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();

    const coinId = this.activatedRoute.snapshot.paramMap.get('coinId');
    this.sourceTab =
      this.activatedRoute.snapshot.queryParamMap.get('from') ?? this.sourceTab;

    if (coinId) {
      this.coin = await this.marketplaceService.getCoinById(coinId);
    }
  }

  navigateToOffer(): void {
    if (!this.coin) {
      return;
    }

    void this.router.navigate(['/tabs/tab2'], {
      queryParams: {
        coinId: this.coin.id,
        from: this.sourceTab,
      },
    });
  }
}
