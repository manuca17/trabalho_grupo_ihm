import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import { Coin, Offer } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';

type InventoryCard = { coin: Coin; lastOffer?: Offer };

type SearchResult = {
  id: string;
  title: string;
  era: string;
  price: string;
  condition: string;
  seller: string;
  forTrade: boolean;
  image: string;
};

type SearchFilters = {
  era: string;
  condition: string;
  priceRange: string;
  availableFor: string;
};

const EUR_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  readonly popularSearchTerms = [
    'Denário',
    'Império Romano',
    'Escudo Português',
    'Dracma',
  ];

  readonly sellerNames = [
    'João Silva',
    'Maria Costa',
    'Carlos Mendes',
    'Ana Sousa',
  ];

  readonly inventoryCards$ = this.marketplaceService.inventoryCards$;

  private readonly searchQuerySubject = new BehaviorSubject('');
  private readonly filtersSubject = new BehaviorSubject<SearchFilters>({
    era: '',
    condition: '',
    priceRange: '',
    availableFor: '',
  });

  readonly searchResults$: Observable<SearchResult[]> = combineLatest([
    this.inventoryCards$,
    this.searchQuerySubject,
    this.filtersSubject,
  ]).pipe(
    map(([cards, searchQuery, filters]) =>
      cards
        .filter((item) => this.matchesSearch(item, searchQuery, filters))
        .map((item) => ({
          id: item.coin.id,
          title: item.coin.name,
          era: item.coin.period,
          price: this.getPriceLabel(item),
          condition: item.coin.conservation,
          seller: this.getSellerName(item.coin.id),
          forTrade: this.isTrade(item),
          image: item.coin.image,
        })),
    ),
  );

  searchQuery = '';
  showFilters = false;
  filters: SearchFilters = {
    era: '',
    condition: '',
    priceRange: '',
    availableFor: '',
  };

  constructor(
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  updateSearchQuery(value: string): void {
    this.searchQuery = value;
    this.searchQuerySubject.next(value ?? '');
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setSearchTerm(term: string): void {
    this.updateSearchQuery(term);
  }

  setFilter(field: keyof SearchFilters, value: string): void {
    this.filters = {
      ...this.filters,
      [field]: value,
    };
    this.filtersSubject.next(this.filters);
  }

  clearFilters(): void {
    this.filters = {
      era: '',
      condition: '',
      priceRange: '',
      availableFor: '',
    };
    this.filtersSubject.next(this.filters);
  }

  clearSearch(): void {
    this.updateSearchQuery('');
  }

  openCoinById(coinId: string): void {
    void this.router.navigate(['/coin', coinId], {
      queryParams: { from: 'pesquisa' },
    });
  }

  openAddOffer(): void {
    void this.router.navigate(['/tabs/tab2']);
  }

  private matchesSearch(
    item: InventoryCard,
    searchQuery: string,
    filters: SearchFilters,
  ): boolean {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const searchableText = [
      item.coin.name,
      item.coin.period,
      item.coin.conservation,
      item.coin.description,
      ...(item.coin.tags ?? []),
    ]
      .join(' ')
      .toLowerCase();

    const matchesQuery =
      !normalizedQuery || searchableText.includes(normalizedQuery);

    const matchesEra =
      !filters.era || item.coin.period.toLowerCase().includes(filters.era);

    const matchesCondition =
      !filters.condition || item.coin.conservation.toLowerCase() === filters.condition;

    const matchesAvailability =
      !filters.availableFor ||
      (filters.availableFor === 'trade'
        ? !!item.lastOffer?.availableForTrade
        : filters.availableFor === 'sale'
        ? !item.lastOffer?.availableForTrade
        : true);

    const price = item.lastOffer?.askPrice ?? item.coin.estimatedValue;
    const matchesPriceRange =
      !filters.priceRange ||
      (filters.priceRange === 'under200' && price < 200) ||
      (filters.priceRange === '200-500' && price >= 200 && price <= 500) ||
      (filters.priceRange === 'above500' && price > 500);

    return (
      matchesQuery &&
      matchesEra &&
      matchesCondition &&
      matchesAvailability &&
      matchesPriceRange
    );
  }

  private getSellerName(coinId: string): string {
    const index = coinId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return this.sellerNames[index % this.sellerNames.length];
  }

  private getPriceLabel(item: InventoryCard): string {
    if (item.lastOffer?.availableForTrade) {
      return 'Troca';
    }

    return EUR_FORMATTER.format(
      item.lastOffer?.askPrice ?? item.coin.estimatedValue,
    );
  }

  private isTrade(item: InventoryCard): boolean {
    return !!item.lastOffer?.availableForTrade;
  }
}
