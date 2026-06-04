import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Camera, CameraResultType } from '@capacitor/camera';
import { firstValueFrom } from 'rxjs';

import { Coin, OfferPhoto } from '../core/models/coin.model';
import { ContentService } from '../core/services/content.service';
import { MarketplaceService } from '../core/services/marketplace.service';

type Tab2Mode = 'create' | 'proposal';
type ProposalType = 'money' | 'trade' | 'both';

const EUR_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  readonly photoSteps: Array<{ kind: OfferPhoto['kind']; label: string }> = [
    { kind: 'obverse', label: 'Anverso' },
    { kind: 'reverse', label: 'Reverso' },
    { kind: 'edge', label: 'Bordo' },
  ];

  // 1. Atualizado com os novos campos vindos do Figma (mantendo a segurança do nonNullable)
  readonly offerForm = this.formBuilder.nonNullable.group({
    coinId: ['', [Validators.required]],
    title: ['', []],
    quantity: [1, [Validators.required, Validators.min(1)]],
    era: ['', [Validators.required]], // Novo do Figma
    condition: ['', [Validators.required]], // Novo do Figma
    description: ['', [Validators.required, Validators.minLength(10)]],
    realValue: [0, [Validators.required, Validators.min(0)]], // Novo do Figma
    availableFor: ['sale', [Validators.required]], // Novo do Figma ('sale' ou 'trade')
    salePrice: [0, [Validators.min(0)]], // Substitui o askPrice antigo para ser condicional
  });

  coins: Coin[] = [];
  selectedCoin?: Coin;
  photos: OfferPhoto[] = [];
  isSubmitting = false;
  submitted = false; // Controla o ecrã de sucesso temporário se quiseres usar
  mode: Tab2Mode = 'create';
  sourceTab = 'inicio';
  supportsTrade = false;
  offerType: ProposalType = 'money';
  offerAmount = '';
  message = '';
  selectedTradeCoinIds: string[] = [];
  ownedCoins: Coin[] = [];
  isProposalSubmitting = false;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly contentService: ContentService,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();
    this.coins = await firstValueFrom(this.contentService.coins$);

    // Reset form and photos when entering the page (fresh state)
    this.resetFormState();

    const requestedCoinId =
      this.activatedRoute.snapshot.queryParamMap.get('coinId');
    this.sourceTab =
      this.activatedRoute.snapshot.queryParamMap.get('from') ?? this.sourceTab;
    this.mode = requestedCoinId ? 'proposal' : 'create';

    if (this.mode === 'proposal') {
      this.setupProposalMode(requestedCoinId);
      return;
    }

    const coinId = requestedCoinId ?? this.coins[0]?.id ?? '';
    this.offerForm.controls.coinId.setValue(coinId);
    this.onCoinChange(coinId);

    // Lógica para ligar/desligar a obrigatoriedade do preço dependendo da seleção
    this.offerForm.controls.availableFor.valueChanges.subscribe((value) => {
      const priceControl = this.offerForm.controls.salePrice;
      if (value === 'sale') {
        priceControl.setValidators([Validators.required, Validators.min(0.01)]);
      } else {
        priceControl.clearValidators();
        priceControl.setValue(0);
      }
      priceControl.updateValueAndValidity();
    });
  }

  /**
   * Resets form fields and photos to initial state.
   */
  private resetFormState(): void {
    this.offerForm.reset({
      coinId: this.coins[0]?.id ?? '',
      title: '',
      quantity: 1,
      era: '',
      condition: '',
      description: '',
      realValue: 0,
      availableFor: 'sale',
      salePrice: 0,
    });
    this.photos = [];
    this.selectedCoin = undefined;
    this.submitted = false;
  }

  get pageTitle(): string {
    if (this.mode === 'proposal') {
      return this.supportsTrade ? 'Propor Troca' : 'Fazer Oferta';
    }

    return 'Adicionar Moeda';
  }

  get proposalPriceLabel(): string {
    if (!this.selectedCoin) {
      return '';
    }

    return EUR_FORMATTER.format(this.selectedCoin.estimatedValue);
  }

  get canSubmitProposal(): boolean {
    if (this.offerType === 'money') {
      return this.hasOfferAmount;
    }

    if (this.offerType === 'trade') {
      return this.selectedTradeCoinIds.length > 0;
    }

    return this.hasOfferAmount || this.selectedTradeCoinIds.length > 0;
  }

  get hasOfferAmount(): boolean {
    return Number(this.offerAmount) > 0;
  }

  get selectedTradeCoins(): Coin[] {
    return this.ownedCoins.filter((coin) =>
      this.selectedTradeCoinIds.includes(coin.id),
    );
  }

  onCoinChange(coinId: string): void {
    this.selectedCoin = this.coins.find((coin) => coin.id === coinId);
  }

  goBackFromProposal(): void {
    if (!this.selectedCoin) {
      void this.router.navigate(['/tabs/tab5']);
      return;
    }

    void this.router.navigate(['/coin', this.selectedCoin.id], {
      queryParams: {
        from: this.sourceTab,
      },
    });
  }

  setOfferType(type: ProposalType): void {
    this.offerType = type;
  }

  toggleTradeCoinSelection(coinId: string): void {
    this.selectedTradeCoinIds = this.selectedTradeCoinIds.includes(coinId)
      ? this.selectedTradeCoinIds.filter((id) => id !== coinId)
      : [...this.selectedTradeCoinIds, coinId];
  }

  async capturePhoto(step: {
    kind: OfferPhoto['kind'];
    label: string;
  }): Promise<void> {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
    });

    if (!photo.dataUrl) {
      return;
    }

    const brightness = await this.calculateBrightness(photo.dataUrl);
    const nextPhoto: OfferPhoto = {
      kind: step.kind,
      label: step.label,
      dataUrl: photo.dataUrl,
      brightness,
    };

    this.photos = [
      ...this.photos.filter((item) => item.kind !== step.kind),
      nextPhoto,
    ].sort(
      (left, right) =>
        this.photoSteps.findIndex((stepItem) => stepItem.kind === left.kind) -
        this.photoSteps.findIndex((stepItem) => stepItem.kind === right.kind),
    );
  }

  // 2. Nova Função: Permite ao utilizador remover a foto clicando no "X" (visto no Figma)
  removePhoto(kind: OfferPhoto['kind']): void {
    this.photos = this.photos.filter((photo) => photo.kind !== kind);
  }

  getPhotoForStep(kind: OfferPhoto['kind']): OfferPhoto | undefined {
    return this.photos.find((photo) => photo.kind === kind);
  }

  getBrightnessTone(brightness: number): string {
    if (brightness < 35) {
      return 'Pouca luz detetada';
    }
    if (brightness < 65) {
      return 'Luminosidade aceitável';
    }
    return 'Boa luminosidade';
  }

  // 3. Modificado para enviar os novos parâmetros para o teu serviço de Backend
  async publishOffer(): Promise<void> {
    if (
      this.offerForm.invalid ||
      this.photos.length !== this.photoSteps.length
    ) {
      this.offerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.offerForm.getRawValue();

      // Adaptado para enviar a estrutura que o teu marketplaceService espera,
      // incluindo as novidades do Figma
      const offer = await this.marketplaceService.publishOffer({
        coinId: formValue.coinId,
        title: formValue.title,
        quantity: formValue.quantity,
        askPrice: formValue.availableFor === 'sale' ? formValue.salePrice : 0,
        description: formValue.description,
        era: formValue.era,
        condition: formValue.condition,
        realValue: formValue.realValue,
        availableForTrade: formValue.availableFor === 'trade',
        photos: this.photos,
      });

      await this.router.navigate(['/offer', offer.id]);
    } catch (err) {
      console.error('Erro ao publicar oferta:', err);
      // Mostrar erro ao utilizador
      alert('Erro ao publicar a oferta. Verifica a consola do navegador (F12) para mais detalhes.');
    } finally {
      this.isSubmitting = false;
    }
  }

  handleSubmit(): void {
    if (this.mode === 'proposal') {
      void this.submitProposal();
      return;
    }

    void this.publishOffer();
  }

  async submitProposal(): Promise<void> {
    if (!this.selectedCoin || !this.canSubmitProposal) {
      return;
    }

    this.isProposalSubmitting = true;

    try {
      const thread = await this.marketplaceService.createProposal({
        offerCoinId: this.selectedCoin.id,
        proposedCoinIds:
          this.offerType === 'money' ? [] : this.selectedTradeCoinIds,
        offerAmount:
          this.offerType === 'trade' ? undefined : Number(this.offerAmount),
        message: this.message.trim(),
      });

      await this.router.navigate(['/negotiation', thread.id], {
        queryParams: {
          from: this.sourceTab,
        },
      });
    } finally {
      this.isProposalSubmitting = false;
    }
  }

  getTradeCoinValue(coin: Coin): string {
    return EUR_FORMATTER.format(coin.estimatedValue);
  }

  private async setupProposalMode(coinId: string | null): Promise<void> {
    if (!coinId) {
      this.mode = 'create';
      return;
    }

    this.onCoinChange(coinId);
    this.ownedCoins = this.coins
      .filter((coin) => coin.id !== coinId)
      .slice(0, 3);

    const inventoryCards = await firstValueFrom(
      this.marketplaceService.inventoryCards$,
    );
    const currentCard = inventoryCards.find((item) => item.coin.id === coinId);
    this.supportsTrade = !!currentCard?.lastOffer?.availableForTrade;
    this.offerType = this.supportsTrade ? 'trade' : 'money';
  }

  private calculateBrightness(dataUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(50);
          return;
        }

        canvas.width = 40;
        canvas.height = 40;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        let total = 0;

        for (let index = 0; index < data.length; index += 4) {
          total += (data[index] + data[index + 1] + data[index + 2]) / 3;
        }

        resolve(Math.round(total / (data.length / 4) / 2.55));
      };
      image.src = dataUrl;
    });
  }
}
