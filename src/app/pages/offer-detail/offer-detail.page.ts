import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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
export class OfferDetailPage implements OnInit {
  coin?: Coin;
  offer?: Offer;
  offerPhotos: OfferPhoto[] = [];

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();

    const offerId = this.activatedRoute.snapshot.paramMap.get('offerId');

    if (!offerId) {
      return;
    }

    this.offer = this.marketplaceService.getOfferById(offerId);

    if (this.offer) {
      this.coin = await this.marketplaceService.getCoinById(this.offer.coinId);
      // Load photos from local storage
      this.offerPhotos = await this.marketplaceService.getOfferPhotos(offerId);
    }
  }

  navigateToProfile(): void {
    void this.router.navigateByUrl('/tabs/tab5');
  }
}
