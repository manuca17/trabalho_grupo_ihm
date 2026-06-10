import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Coin } from '../../core/models/coin.model';
import { Offer } from '../../core/models/offer.model';
import { OfferPhoto } from '../../core/models/offer-photo.model';
import { MarketplaceService } from '../../core/services/marketplace.service';

/**
 * Summarizes the offer just published and links it to the negotiation flow.
 */
@Component({
  selector: 'app-offer-detail',
  templateUrl: './offer-detail.page.html',
  styleUrls: ['./offer-detail.page.scss'],
  standalone: false,
})
export class OfferDetailPage implements OnInit, OnDestroy {
  coin?: Coin;
  offer?: Offer;
  offerPhotos: OfferPhoto[] = [];
  displayPrice = '';

  private activeCurrency: 'EUR' | 'USD' | 'JPY' | 'BRL' = 'EUR';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();

    this.marketplaceService.activeCurrency$
      .pipe(takeUntil(this.destroy$))
      .subscribe((c) => {
        this.activeCurrency = c;
        this.updateDisplayPrice();
      });

    const offerId = this.activatedRoute.snapshot.paramMap.get('offerId');
    if (!offerId) return;

    this.offer = this.marketplaceService.getOfferById(offerId);
    if (this.offer) {
      this.coin = await this.marketplaceService.getCoinById(this.offer.coinId);
      this.offerPhotos = await this.marketplaceService.getOfferPhotos(offerId);
      this.updateDisplayPrice();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateDisplayPrice(): void {
    if (!this.offer) return;
    this.displayPrice = this.marketplaceService.formatCurrency(this.offer.askPrice, this.activeCurrency);
  }

  navigateToProfile(): void {
    void this.router.navigateByUrl('/tabs/tab5');
  }
}
