import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';

import { Coin, Offer } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';

type InventoryCard = { coin: Coin; lastOffer?: Offer; customDisplayPrice?: string };

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

@Component({
  selector: 'app-tab6',
  templateUrl: 'tab6.page.html',
  styleUrls: ['tab6.page.scss'],
  standalone: false,
})
export class Tab6Page {
  readonly popularSearchTerms = [
    'Denário',
    'Império Romano',
    'Escudo Português',
    'Dracma',
  ];

  readonly eraOptions = [
    { label: 'Todas as eras', value: '' },
    { label: 'Grécia Antiga', value: 'Grécia' },
    { label: 'Roma Antiga', value: 'Roma' },
    { label: 'Portugal Medieval', value: 'Portugal' },
  ];

  readonly conditionOptions = [
    { label: 'Todos os estados', value: '' },
    { label: 'Excelente', value: 'excelente' },
    { label: 'Muito Bom', value: 'muito bom' },
    { label: 'Bom', value: 'bom' },
  ];

  readonly availableForOptions = [
    { label: 'Tudo', value: '' },
    { label: 'Venda', value: 'sale' },
    { label: 'Troca', value: 'trade' },
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
          seller: item.coin.sellerName ?? 'Colecionador Ancient Coins',
          forTrade: this.isTrade(item),
          image: item.coin.image,
        })),
    ),
  );

  searchQuery = '';
  showFilters = false;
  filters: SearchFilters = { era: '', condition: '', priceRange: '', availableFor: '' };

  // Pending state bound to the dropdowns — only pushed on "Aplicar Filtros"
  pendingEra = '';
  pendingCondition = '';
  pendingAvailableFor = '';

  constructor(
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  updateSearchQuery(value: any): void {
    const safeValue = value ? value.toString() : '';
    this.searchQuery = safeValue;
    this.searchQuerySubject.next(safeValue);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  setSearchTerm(term: string): void {
    this.updateSearchQuery(term);
  }

  applyFilters(): void {
    this.filters = {
      ...this.filters,
      era: this.pendingEra,
      condition: this.pendingCondition,
      availableFor: this.pendingAvailableFor,
    };
    this.filtersSubject.next(this.filters);
    this.showFilters = false;
  }

  clearFilters(): void {
    this.pendingEra = '';
    this.pendingCondition = '';
    this.pendingAvailableFor = '';
    this.filters = { era: '', condition: '', priceRange: '', availableFor: '' };
    this.filtersSubject.next(this.filters);
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.era || this.filters.condition || this.filters.availableFor);
  }

  openCoinById(coinId: string): void {
    void this.router.navigate(['/coin', coinId], {
      queryParams: { from: 'pesquisa' },
    });
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

    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);

    const searchableEra = [item.coin.period, item.coin.name, ...(item.coin.tags ?? [])].join(' ').toLowerCase();
    const matchesEra = !filters.era || searchableEra.includes(filters.era.toLowerCase());

    const matchesCondition = !filters.condition || item.coin.conservation.toLowerCase() === filters.condition;
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

    return matchesQuery && matchesEra && matchesCondition && matchesAvailability && matchesPriceRange;
  }

  private getPriceLabel(item: InventoryCard): string {
    return item.customDisplayPrice ?? (item.lastOffer?.availableForTrade ? 'Troca' : '');
  }

  private isTrade(item: InventoryCard): boolean {
    return !!item.lastOffer?.availableForTrade;
  }
}
