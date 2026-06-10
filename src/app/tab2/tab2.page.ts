import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Camera, CameraResultType } from '@capacitor/camera';
import { ToastController } from '@ionic/angular';

import { OfferPhoto } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';

type Tab2Mode = 'create' | 'edit';

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

  readonly offerForm = this.formBuilder.nonNullable.group({
    coinId: ['', [Validators.required]],
    title: ['', []],
    quantity: [1, [Validators.required, Validators.min(1)]],
    era: ['', [Validators.required]],
    condition: ['', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    realValue: [0, [Validators.required, Validators.min(0)]],
    availableFor: ['sale', [Validators.required]],
    salePrice: [0, [Validators.min(0)]],
  });

  photos: OfferPhoto[] = [];
  isSubmitting = false;
  mode: Tab2Mode = 'create';
  editingOfferId: string | null = null;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly toastController: ToastController,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  ionViewWillEnter(): void {
    const offerId = this.activatedRoute.snapshot.queryParamMap.get('offerId');
    if (offerId) {
      this.mode = 'edit';
      this.editingOfferId = offerId;
      void this.loadOfferForEdit(offerId);
    } else {
      this.resetFormState();
    }
  }

  async ngOnInit(): Promise<void> {
    await this.marketplaceService.init();

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

  private resetFormState(): void {
    this.mode = 'create';
    this.editingOfferId = null;
    this.offerForm.reset({
      coinId: `custom-coin-${Date.now()}`,
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
  }

  get pageTitle(): string {
    return this.mode === 'edit' ? 'Editar Moeda' : 'Adicionar Moeda';
  }

  private async loadOfferForEdit(offerId: string): Promise<void> {
    const offer = this.marketplaceService.getOfferById(offerId);
    if (!offer) return;
    const storedPhotos = await this.marketplaceService.getOfferPhotos(offerId);
    this.photos = storedPhotos.length ? storedPhotos : offer.photos.filter((p) => p.dataUrl);
    this.offerForm.patchValue({
      coinId: offer.coinId,
      title: offer.title,
      quantity: offer.quantity,
      era: offer.era,
      condition: offer.condition,
      description: offer.description,
      realValue: offer.realValue,
      availableFor: offer.availableForTrade ? 'trade' : 'sale',
      salePrice: offer.availableForTrade ? 0 : offer.askPrice,
    });
    const priceControl = this.offerForm.controls.salePrice;
    if (!offer.availableForTrade) {
      priceControl.setValidators([Validators.required, Validators.min(0.01)]);
      priceControl.updateValueAndValidity();
    }
  }

  async capturePhoto(step: { kind: OfferPhoto['kind']; label: string }): Promise<void> {
    const photo = await Camera.getPhoto({ quality: 80, allowEditing: true, resultType: CameraResultType.DataUrl });
    if (!photo.dataUrl) return;
    const brightness = await this.calculateBrightness(photo.dataUrl);
    const nextPhoto: OfferPhoto = { kind: step.kind, label: step.label, dataUrl: photo.dataUrl, brightness };
    this.photos = [
      ...this.photos.filter((item) => item.kind !== step.kind),
      nextPhoto,
    ].sort((left, right) =>
      this.photoSteps.findIndex((s) => s.kind === left.kind) -
      this.photoSteps.findIndex((s) => s.kind === right.kind),
    );
  }

  removePhoto(kind: OfferPhoto['kind']): void {
    this.photos = this.photos.filter((photo) => photo.kind !== kind);
  }

  getPhotoForStep(kind: OfferPhoto['kind']): OfferPhoto | undefined {
    return this.photos.find((photo) => photo.kind === kind);
  }

  getBrightnessTone(brightness: number): string {
    if (brightness < 35) return 'Pouca luz detetada';
    if (brightness < 65) return 'Luminosidade aceitável';
    return 'Boa luminosidade';
  }

  async handleSubmit(): Promise<void> {
    if (this.offerForm.invalid || this.photos.length !== this.photoSteps.length) {
      this.offerForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    try {
      const formValue = this.offerForm.getRawValue();
      const offerInput = {
        title: formValue.title,
        quantity: formValue.quantity,
        askPrice: formValue.availableFor === 'sale' ? formValue.salePrice : 0,
        description: formValue.description,
        era: formValue.era,
        condition: formValue.condition,
        realValue: formValue.realValue,
        availableForTrade: formValue.availableFor === 'trade',
        photos: this.photos,
      };
      const wasEdit = this.mode === 'edit';
      if (wasEdit && this.editingOfferId) {
        await this.marketplaceService.updateOffer(this.editingOfferId, offerInput);
      } else {
        await this.marketplaceService.publishOffer({ coinId: formValue.coinId, ...offerInput });
      }
      this.resetFormState();
      const toast = await this.toastController.create({
        message: wasEdit ? 'Moeda atualizada com sucesso!' : 'Moeda publicada com sucesso!',
        duration: 2500,
        position: 'bottom',
        color: 'success',
        icon: 'checkmark-circle-outline',
      });
      await toast.present();
      if (wasEdit) {
        await this.router.navigate(['/tabs/tab5'], { queryParams: { nav: 'profile' } });
      }
    } catch (err) {
      console.error('Erro ao submeter oferta:', err);
      const toast = await this.toastController.create({
        message: 'Erro ao guardar a moeda. Tenta novamente.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
        icon: 'alert-circle-outline',
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }

  private calculateBrightness(dataUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) { resolve(50); return; }
        canvas.width = 40; canvas.height = 40;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let total = 0;
        for (let i = 0; i < data.length; i += 4) total += (data[i] + data[i + 1] + data[i + 2]) / 3;
        resolve(Math.round(total / (data.length / 4) / 2.55));
      };
      image.src = dataUrl;
    });
  }
}
