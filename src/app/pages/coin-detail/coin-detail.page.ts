import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Coin } from '../../core/models/coin.model';
import { MarketplaceService } from '../../core/services/marketplace.service';

type CoinDetailExtra = {
  seller: string;
  sellerRating: number;
  origin: string;
  weight: string;
  diameter: string;
  history: string;
  reference: string;
};

const EUR_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const COIN_DETAIL_EXTRAS: Record<string, CoinDetailExtra> = {
  'coin-aureus-augustus': {
    seller: 'João Silva',
    sellerRating: 4.8,
    origin: 'Roma Antiga',
    weight: '7.9g',
    diameter: '19mm',
    history:
      'Cunhada durante o reinado de Augusto, esta peça representa a consolidação do poder imperial e a difusão da imagem do primeiro imperador romano pelo império.',
    reference: 'RIC I 544',
  },
  'coin-denarius-trajan': {
    seller: 'Maria Costa',
    sellerRating: 4.6,
    origin: 'Roma Imperial',
    weight: '3.2g',
    diameter: '18mm',
    history:
      'O denário de Trajano é uma das moedas mais procuradas do período alto-imperial, refletindo a expansão territorial romana e o prestígio militar do imperador.',
    reference: 'RIC II 102',
  },
  'coin-follis-constantine': {
    seller: 'Carlos Mendes',
    sellerRating: 4.7,
    origin: 'Império Romano Tardio',
    weight: '4.6g',
    diameter: '22mm',
    history:
      'Associada ao período de Constantino I, esta moeda pertence a uma fase de reorganização monetária do império e circulou amplamente em contexto urbano e militar.',
    reference: 'LRBC I 812',
  },
};

/**
 * Shows the complete coin sheet loaded from the inventory catalog.
 */
@Component({
  selector: 'app-coin-detail',
  templateUrl: './coin-detail.page.html',
  styleUrls: ['./coin-detail.page.scss'],
  standalone: false,
})
export class CoinDetailPage implements OnInit {
  coin?: Coin;
  sourceTab = 'inventario';
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
    }
  }

  goBack(): void {
    const target =
      this.sourceTab === 'pesquisa'
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
    const extra = COIN_DETAIL_EXTRAS[this.coin.id];

    this.isTrade = !!card?.lastOffer?.availableForTrade;
    this.displayPrice = this.isTrade
      ? 'Troca'
      : EUR_FORMATTER.format(
          card?.lastOffer?.askPrice ?? this.coin.estimatedValue,
        );
    this.sellerName = extra?.seller ?? 'Colecionador Ancient Coins';
    this.sellerRating = extra?.sellerRating ?? 4.7;
    this.origin = extra?.origin ?? this.coin.emperor;
    this.weight = extra?.weight ?? 'N/D';
    this.diameter = extra?.diameter ?? 'N/D';
    this.history = extra?.history ?? this.coin.description;
    this.reference = extra?.reference ?? 'Sem referência catalográfica';
    this.galleryImages = [
      { src: this.coin.image, label: 'Anverso' },
      { src: this.coin.image, label: 'Reverso' },
      { src: this.coin.image, label: 'Detalhe' },
    ];
  }
}
