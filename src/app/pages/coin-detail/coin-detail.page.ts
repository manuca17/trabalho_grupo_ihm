import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { Coin } from '../../core/models/coin.model';
import { MarketplaceService } from '../../core/services/marketplace.service';

@Component({
  selector: 'app-coin-detail',
  templateUrl: './coin-detail.page.html',
  styleUrls: ['./coin-detail.page.scss'],
  standalone: false,
})
export class CoinDetailPage implements OnInit, OnDestroy {
  coin?: Coin;
  sourceTab = 'inicio';
  selectedImageIndex = 0;
  isSaved = false;
  displayPrice = '';
  isTrade = false;
  sellerName = '';
  sellerRating = 0;
  origin = '';
  weight = '';
  diameter = '';
  history = '';
  reference = '';
  galleryImages: Array<{ src: string; label: string }> = [];
  
  private marketplaceSubscription?: Subscription;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();
    const coinId = this.activatedRoute.snapshot.paramMap.get('coinId');
    this.sourceTab = this.activatedRoute.snapshot.queryParamMap.get('from') ?? 'inicio';

    if (coinId) {
      this.coin = await this.marketplaceService.getCoinById(coinId);
      await this.populateScreenState();
      
      this.marketplaceSubscription = this.marketplaceService.inventoryCards$.subscribe((cards) => {
        const foundCard = cards.find((item) => item.coin.id === coinId);
        if (foundCard) {
          this.weight = foundCard.coin.weight ?? 'N/D';
          this.displayPrice = foundCard.customDisplayPrice || '';
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.marketplaceSubscription?.unsubscribe();
  }

  goBack(): void {
    const target = this.sourceTab === 'inicio' ? '/tabs/tab1' : '/tabs/tab5';
    void this.router.navigateByUrl(target);
  }

  selectImage(index: number): void { this.selectedImageIndex = index; }
  toggleSaved(): void { this.isSaved = !this.isSaved; }

  async shareCoin(): Promise<void> {
    if (navigator.share && this.coin) {
      await navigator.share({ title: this.coin.name, text: this.coin.description, url: window.location.href });
    }
  }

  contactSeller(): void {
    void this.router.navigate(['/tabs/tab4']);
  }

  navigateToOffer(): void {
    if (this.coin) {
      void this.router.navigate(['/tabs/tab2'], { queryParams: { coinId: this.coin.id, from: this.sourceTab } });
    }
  }

  private async populateScreenState(): Promise<void> {
    if (!this.coin) return;
    this.sellerName = this.coin.sellerName ?? 'Colecionador Ancient Coins';
    this.sellerRating = this.coin.sellerRating ?? 4.7;
    this.origin = this.coin.origin ?? this.coin.emperor;
    this.diameter = this.coin.diameter ?? 'N/D';
    this.history = this.coin.history ?? this.coin.description;
    this.reference = this.coin.reference ?? 'Sem referência catalográfica';
    
    const coinImages = this.coin.images ?? { obverse: this.coin.image, reverse: this.coin.image, edge: this.coin.image };
    this.galleryImages = [
      { src: coinImages.obverse, label: 'Anverso' },
      { src: coinImages.reverse, label: 'Reverso' },
      { src: coinImages.edge, label: 'Bordo' },
    ];
  }
}