import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, filter, map, startWith } from 'rxjs';

import { MarketplaceService } from '../core/services/marketplace.service';

type NavKey = 'home' | 'search' | 'add' | 'messages' | 'profile';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  readonly activeNav$: Observable<NavKey> = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.getActiveNav(this.router.url)),
  );

  readonly unreadCount$: Observable<number> =
    this.marketplaceService.negotiations$.pipe(
      map((threads) =>
        threads.reduce((total, thread) => total + thread.unreadCount, 0),
      ),
    );

  constructor(
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  private getActiveNav(url: string): NavKey {
    if (url.includes('/tabs/tab5')) {
      return url.includes('nav=profile') ? 'profile' : 'home';
    }

    if (url.includes('/tabs/tab2')) {
      return 'add';
    }

    if (url.includes('/tabs/tab4')) {
      return 'messages';
    }

    if (url.includes('/tabs/tab3')) {
      return 'messages';
    }

    if (url.includes('/tabs/tab1')) {
      return 'search';
    }

    return 'home';
  }
}
