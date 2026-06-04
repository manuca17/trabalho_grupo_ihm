import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';

import { UserProfile } from '../core/models/auth.model';
import { Coin } from '../core/models/coin.model';
import { NegotiationThread } from '../core/models/negotiation-thread.model';
import { Offer } from '../core/models/offer.model';
import { AuthService } from '../core/services/auth.service';
import { MarketplaceService } from '../core/services/marketplace.service';

type InventoryCard = { coin: Coin; lastOffer?: Offer };

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: false,
})
export class Tab5Page {
  activeTab: 'active' | 'sold' | 'traded' = 'active';
  soldCoinsCount = 1;
  tradedCoinsCount = 1;
  showSettings: boolean = false;
  showEditProfile: boolean = false;

  currentUnit: string = 'Gramas (g)';
  // NOVO: Variável local para exibir o estado atual da moeda comercial na lista
  currentCurrency: string = 'Euro (€)';
  notificationsEnabled: boolean = true;
  
  newName: string = '';
  newPhotoUrl: string = '';

  readonly currentProfile$: Observable<UserProfile | null> = this.authService.currentProfile$;
  readonly inventoryCards$ = this.marketplaceService.inventoryCards$;
  readonly featuredCoins$ = this.inventoryCards$.pipe(map((cards) => cards.slice(0, 4)));
  
  readonly summary$ = combineLatest([
    this.inventoryCards$,
    this.marketplaceService.offers$,
  ]).pipe(
    map(([cards, offers]) => ({
      availableCount: cards.length,
      tradeCount: offers.filter((offer) => offer.availableForTrade).length,
    })),
  );
  
  readonly myCoins$ = combineLatest([
    this.inventoryCards$,
    this.currentProfile$,
  ]).pipe(
    map(([cards, profile]) => {
      if (!profile) return [];
      return cards.filter((item) => item.lastOffer?.ownerId === profile.id).reverse();
    }),
  );

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController
  ) {}

  setActiveTab(tab: 'active' | 'sold' | 'traded'): void {
    this.activeTab = tab;
  }

  openCoin(coin: Coin): void {
    void this.router.navigate(['/coin', coin.id], {
      queryParams: { from: 'perfil' },
    });
  }

  editCoin(coin: Coin): void {
    void this.router.navigate(['/tabs/tab2'], {
      queryParams: { coinId: coin.id },
    });
  }

  removeCoin(coin: Coin): void {
    console.log('Remover moeda:', coin.name);
  }

  openSettings(): void {
    this.showSettings = true;
    this.showEditProfile = false;
  }

  closeSettings(): void {
    this.showSettings = false;
    this.showEditProfile = false;
  }

  openAddOffer(): void { void this.router.navigate(['/tabs/tab2']); }
  openMessages(): void { void this.router.navigate(['/tabs/tab4']); }

  openEditProfile() {
    this.showEditProfile = true;
    const currentProfile = this.authService.currentProfileSnapshot;
    this.newName = currentProfile?.displayName || '';
    this.newPhotoUrl = currentProfile?.avatarUrl || '';
  }

  closeEditProfile() { this.showEditProfile = false; }

  async saveProfileChanges() {
    if (!this.newName.trim()) {
      const toast = await this.toastController.create({
        message: 'O nome do perfil não pode ficar vazio.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }
    try {
      await this.authService.updateProfileFields(this.newName, this.newPhotoUrl);
      const toast = await this.toastController.create({
        message: 'Perfil de numismata atualizado com sucesso!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      this.showEditProfile = false;
    } catch {
      const toast = await this.toastController.create({
        message: 'Ocorreu um erro ao gravar as alterações.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async triggerChangeUnit() {
    const alert = await this.alertController.create({
      header: 'Unidade de Medida',
      cssClass: 'orange-alert-theme',
      inputs: [
        { type: 'radio', label: 'Gramas (g)', value: 'Gramas (g)', checked: this.currentUnit === 'Gramas (g)' },
        { type: 'radio', label: 'Onças (oz)', value: 'Onças (oz)', checked: this.currentUnit === 'Onças (oz)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: (data) => {
            if (data) {
              this.currentUnit = data;
              this.marketplaceService.updateActiveUnit(data === 'Gramas (g)' ? 'g' : 'oz');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // NOVO MÉTODO: Caixa de rádio para selecionar a divisa de negociação (EUR/USD) com classe CSS laranja
  async triggerChangeCurrency() {
    const alert = await this.alertController.create({
      header: 'Moeda Comercial',
      cssClass: 'orange-alert-theme',
      inputs: [
        { type: 'radio', label: 'Euro (€)', value: 'Euro (€)', checked: this.currentCurrency === 'Euro (€)' },
        { type: 'radio', label: 'Dólar ($)', value: 'Dólar ($)', checked: this.currentCurrency === 'Dólar ($)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: (data) => {
            if (data) {
              this.currentCurrency = data;
              this.marketplaceService.updateActiveCurrency(data === 'Euro (€)' ? 'EUR' : 'USD');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleNotificationsEvent(event: any) {
    this.notificationsEnabled = event.detail.checked;
    const toast = await this.toastController.create({
      message: this.notificationsEnabled ? 'Notificações ativadas.' : 'Notificações desativadas.',
      duration: 1500,
      color: this.notificationsEnabled ? 'success' : 'warning'
    });
    await toast.present();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/'], { replaceUrl: true });
  }
}