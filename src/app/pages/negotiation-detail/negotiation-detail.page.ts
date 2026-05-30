import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Coin, NegotiationThread } from '../../core/models/coin.model';
import { MarketplaceService } from '../../core/services/marketplace.service';

/**
 * Hosts the local chat that simulates the trade negotiation flow.
 */
@Component({
  selector: 'app-negotiation-detail',
  templateUrl: './negotiation-detail.page.html',
  styleUrls: ['./negotiation-detail.page.scss'],
  standalone: false,
})
export class NegotiationDetailPage implements OnInit {
  draftMessage = '';
  offerCoin?: Coin;
  proposerCoin?: Coin;
  thread?: NegotiationThread;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();

    const threadId = this.activatedRoute.snapshot.paramMap.get('threadId');

    if (!threadId) {
      return;
    }

    this.thread = this.marketplaceService.getNegotiationById(threadId);

    if (!this.thread) {
      return;
    }

    const [offerCoin, proposerCoin] = await Promise.all([
      this.marketplaceService.getCoinById(this.thread.offerCoinId),
      this.marketplaceService.getCoinById(this.thread.proposerCoinId),
    ]);
    this.offerCoin = offerCoin;
    this.proposerCoin = proposerCoin;
  }

  async sendMessage(): Promise<void> {
    const normalizedMessage = this.draftMessage.trim();

    if (!this.thread || !normalizedMessage) {
      return;
    }

    await this.marketplaceService.addNegotiationMessage(
      this.thread.id,
      'Maria',
      normalizedMessage,
    );
    this.thread = this.marketplaceService.getNegotiationById(this.thread.id);
    this.draftMessage = '';
  }

  async acceptTrade(): Promise<void> {
    if (!this.thread) {
      return;
    }

    await this.marketplaceService.markNegotiationAsTraded(this.thread.id);
    this.thread = this.marketplaceService.getNegotiationById(this.thread.id);
  }
}
