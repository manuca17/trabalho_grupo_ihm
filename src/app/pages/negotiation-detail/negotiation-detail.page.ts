import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

import { Coin, NegotiationThread } from '../../core/models/coin.model';
import { AuthService } from '../../core/services/auth.service';
import { MarketplaceService } from '../../core/services/marketplace.service';

@Component({
  selector: 'app-negotiation-detail',
  templateUrl: './negotiation-detail.page.html',
  styleUrls: ['./negotiation-detail.page.scss'],
  standalone: false,
})
export class NegotiationDetailPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  draftMessage = '';
  offerCoin?: Coin;
  proposerCoin?: Coin;
  thread?: NegotiationThread;
  currentUserId = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly marketplaceService: MarketplaceService,
    private readonly authService: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.authService.ensureInitialized();
    this.currentUserId =
      this.authService.currentProfileSnapshot?.id ?? 'anonymous-user';

    await this.marketplaceService.init();

    const threadId = this.activatedRoute.snapshot.paramMap.get('threadId');

    if (!threadId) {
      return;
    }

    this.marketplaceService
      .getNegotiationById$(threadId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((updatedThread) => {
        this.thread = updatedThread;
        setTimeout(() => this.content?.scrollToBottom(200), 50);
      });

    const snapshotThread = this.marketplaceService.getNegotiationById(threadId);
    if (snapshotThread) {
      const [offerCoin, proposerCoin] = await Promise.all([
        this.marketplaceService.getCoinById(snapshotThread.offerCoinId),
        this.marketplaceService.getCoinById(snapshotThread.proposerCoinId),
      ]);
      this.offerCoin = offerCoin;
      this.proposerCoin = proposerCoin;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async sendMessage(): Promise<void> {
    const normalizedMessage = this.draftMessage.trim();

    if (!this.thread || !normalizedMessage) {
      return;
    }

    await this.marketplaceService.addNegotiationMessage(
      this.thread.id,
      normalizedMessage,
    );
    this.draftMessage = '';
  }

  async acceptProposal(): Promise<void> {
    if (!this.thread) {
      return;
    }

    await this.marketplaceService.acceptProposal(this.thread.id);
  }

  async confirmTrade(): Promise<void> {
    if (!this.thread) {
      return;
    }

    await this.marketplaceService.markNegotiationAsTraded(this.thread.id);
  }

  isOwnMessage(message: { userId: string }): boolean {
    return message.userId === this.currentUserId;
  }

  isSystemMessage(message: { userId: string }): boolean {
    return message.userId === 'system';
  }
}
