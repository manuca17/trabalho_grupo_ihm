import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

import { NegotiationThread } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  readonly negotiations$: Observable<NegotiationThread[]> =
    this.marketplaceService.negotiations$;
  highlightedOfferId?: string | null;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  ngOnInit(): void {
    this.highlightedOfferId =
      this.activatedRoute.snapshot.queryParamMap.get('offerId');
  }

  openNegotiation(thread: NegotiationThread): void {
    void this.router.navigate(['/negotiation', thread.id], {
      queryParams: {
        offerId: thread.offerId,
      },
    });
  }

  isHighlighted(thread: NegotiationThread): boolean {
    return (
      !!this.highlightedOfferId && this.highlightedOfferId === thread.offerId
    );
  }
}
