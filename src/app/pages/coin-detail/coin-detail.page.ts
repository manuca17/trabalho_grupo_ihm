import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

import { Coin } from '../../core/models/coin.model';
import { MarketplaceService } from '../../core/services/marketplace.service';

type CoinDetailExtra = {
  seller: string;
  sellerRating: number;
  origin: string;
  diameter: string;
  history: string;
  reference: string;
};

const EUR_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-coin-detail',
  templateUrl: './coin-detail.page.html',
  styleUrls: ['./coin-detail.page.scss'],
  standalone: false,
})
export class CoinDetailPage implements OnInit, OnDestroy {
  coin?: Coin;
  sourceTab = 'inicio'; // Alinhado com a rota de retorno reajustada
  selectedImageIndex = 0;
  isSaved = false;
  displayPrice = '';
  isTrade = false;
  sellerName = '';
  sellerRating = 0;
  origin = '';
  weight = ''; // Campo reativo atualizado por subscrição
  diameter = '';
  history = '';
  reference = '';
  galleryImages: Array<{ src: string; label: string }> = [];
  
  private cardsSubscription?: Subscription;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();

    const coinId = this.activatedRoute.snapshot.paramMap.get('coinId');
    this.sourceTab =
      this.activatedRoute.snapshot.queryParamMap.get('from') ?? this.sourceTab;

    if (coinId) {
      this.coin = await this.marketplaceService.getCoinById(coinId);
      await this.populateScreenState();
      
      // NOVO: Subscrição em tempo real para escutar se o utilizador altera a unidade de medida
      this.cardsSubscription = this.marketplaceService.inventoryCards$.subscribe((cards) => {
        const foundCard = cards.find((item) => item.coin.id === coinId);
        if (foundCard) {
          // Atribui o peso já convertido matematicamente pelo MarketplaceService (g ou oz)
          this.weight = foundCard.coin.weight ?? 'N/D';
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.cardsSubscription) {
      this.cardsSubscription.unsubscribe();
    }
  }

  goBack(): void {
    const target =
      this.sourceTab === 'inicio'
        ? '/tabs/tab1'
        : this.sourceTab === 'mensagens'
          ? '/tabs/tab4'
          : '/tabs/tab5';

    void this.router.navigateByUrl(target);
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  toggleSaved(): void {
    this.isSaved = !this.isSaved;
  }

  async shareCoin(): Promise<void> {
    if (!this.coin || !navigator.share) {
      return;
    }

    await navigator.share({
      title: this.coin.name,
      text: this.coin.description,
      url: window.location.href,
    });
  }

  contactSeller(): void {
    void this.router.navigate(['/tabs/tab4']);
  }

  navigateToOffer(): void {
    if (!this.coin) {
      return;
    }

    void this.router.navigate(['/tabs/tab2'], {
      queryParams: {
        coinId: this.coin.id,
        from: this.sourceTab,
      },
    });
  }

  private async populateScreenState(): Promise<void> {
    if (!this.coin) {
      return;
    }

    const inventoryCards = await firstValueFrom(
      this.marketplaceService.inventoryCards$,
    );
    const card = inventoryCards.find((item) => item.coin.id === this.coin?.id);
    const extra: CoinDetailExtra = {
      seller: this.coin.sellerName ?? 'Colecionador Ancient Coins',
      sellerRating: this.coin.sellerRating ?? 4.7,
      origin: this.coin.origin ?? this.coin.emperor,
      diameter: this.coin.diameter ?? 'N/D',
      history: this.coin.history ?? this.coin.description,
      reference: this.coin.reference ?? 'Sem referência catalográfica',
    };

    this.isTrade = !!card?.lastOffer?.availableForTrade;
    this.displayPrice = this.isTrade
      ? 'Troca'
      : EUR_FORMATTER.format(
          card?.lastOffer?.askPrice ?? this.coin.estimatedValue,
        );
    this.sellerName = extra.seller;
    this.sellerRating = extra.sellerRating;
    this.origin = extra.origin;
    this.diameter = extra.diameter;
    this.history = extra.history;
    this.reference = extra.reference;
    
    const coinImages = this.coin.images ?? {
      obverse: this.coin.image,
      reverse: this.coin.image,
      edge: this.coin.image,
    };
    this.galleryImages = [
      { src: coinImages.obverse, label: 'Anverso' },
      { src: coinImages.reverse, label: 'Reverso' },
      { src: coinImages.edge, label: 'Bordo' },
    ];
  }
}