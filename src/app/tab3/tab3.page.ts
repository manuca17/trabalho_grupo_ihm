import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';

import { NegotiationThread } from '../core/models/negotiation-thread.model';
import { AuthService } from '../core/services/auth.service';
import { MarketplaceService } from '../core/services/marketplace.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {
  searchText = '';
  negotiations: NegotiationThread[] = [];
  currentUserId = '';
  highlightedOfferId?: string | null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
    private readonly authService: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.authService.ensureInitialized();
    this.currentUserId =
      this.authService.currentProfileSnapshot?.id ?? 'anonymous-user';

    await this.marketplaceService.init();

    this.highlightedOfferId =
      this.activatedRoute.snapshot.queryParamMap.get('offerId');

    this.marketplaceService.negotiations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((threads) => {
        this.negotiations = threads;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredConversations(): NegotiationThread[] {
    const raw = this.searchText ?? '';
    const filter = raw.toLowerCase().trim();

    if (!filter) {
      return this.negotiations;
    }

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');

    const tokens = filter
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    return this.negotiations.filter((thread) => {
      const proposer = normalize(thread.proposerName);
      const seller = normalize(thread.sellerName);
      const lastMessage = thread.messages.length > 0
        ? normalize(thread.messages[thread.messages.length - 1].body)
        : '';

      return tokens.every(
        (token) =>
          proposer.includes(token) ||
          seller.includes(token) ||
          lastMessage.includes(token),
      );
    });
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

  getLastMessage(thread: NegotiationThread): string {
    if (thread.messages.length === 0) {
      return 'Sem mensagens';
    }
    const last = thread.messages[thread.messages.length - 1];
    return last.body.length > 80
      ? last.body.substring(0, 80) + '...'
      : last.body;
  }

  getLastMessageTime(thread: NegotiationThread): string {
    if (thread.messages.length === 0) {
      return '';
    }
    const lastSentAt = thread.messages[thread.messages.length - 1].sentAt;
    const date = new Date(lastSentAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} min`;
    }
    if (diffHours < 24) {
      return `${diffHours}h`;
    }
    if (diffHours < 48) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  getConversationName(thread: NegotiationThread): string {
    return thread.proposerName !== this.getMyName()
      ? thread.proposerName
      : thread.sellerName;
  }

  getAvatar(): string {
    return '👤';
  }

  private getMyName(): string {
    return this.authService.currentProfileSnapshot?.displayName ?? 'Visitante';
  }
}