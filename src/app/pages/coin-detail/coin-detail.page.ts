import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { Coin } from '../../core/models/coin.model';
import { NegotiationThread } from '../../core/models/negotiation-thread.model';
import { Offer } from '../../core/models/offer.model';
import { AuthService } from '../../core/services/auth.service';
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
  isOwnCoin = false;
  linkedOffer?: Offer;
  linkedThread?: NegotiationThread;

  private marketplaceSubscription?: Subscription;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();
    const coinId = this.activatedRoute.snapshot.paramMap.get('coinId');
    this.sourceTab = this.activatedRoute.snapshot.queryParamMap.get('from') ?? 'inicio';

    if (coinId) {
      await this.authService.ensureInitialized();
      this.coin = await this.marketplaceService.getCoinById(coinId);
      await this.populateScreenState();

      // Carregar oferta e thread ligados
      const cards = await firstValueFrom(this.marketplaceService.inventoryCards$);
      const linkedCard = cards.find((item) => item.coin.id === coinId);
      this.linkedOffer = linkedCard?.lastOffer;

      // Verificar se é moeda própria
      const currentProfile = this.authService.currentProfileSnapshot;
      this.isOwnCoin = !!this.linkedOffer && this.linkedOffer.ownerId === currentProfile?.id;

      // Encontrar thread de negociação existente
      if (this.linkedOffer) {
        const threads = await firstValueFrom(this.marketplaceService.negotiations$);
        this.linkedThread = threads.find((t) => t.offerId === this.linkedOffer!.id);
      }

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

  async contactSeller(): Promise<void> {
    let thread = this.linkedThread;
    if (!thread && this.coin) {
      thread = await this.marketplaceService.startContactThread(
        this.coin.id,
        this.coin.name,
        this.sellerName,
      );
      this.linkedThread = thread;
    }
    if (thread) {
      void this.router.navigate(['/negotiation', thread.id]);
    } else {
      void this.router.navigate(['/tabs/tab3']);
    }
  }

  navigateToOffer(): void {
    if (this.coin) {
      void this.router.navigate(['/make-offer'], { queryParams: { coinId: this.coin.id, from: this.sourceTab } });
    }
  }

  private async populateScreenState(): Promise<void> {
    if (!this.coin) return;
    this.sellerName = this.coin.sellerName ?? 'Colecionador Ancient Coins';
    this.sellerRating = this.coin.sellerRating ?? 0;
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