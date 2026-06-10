import { Component, OnInit } from '@angular/core';
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

const EUR_FORMATTER = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: false,
})
export class Tab5Page implements OnInit {
  activeTab: 'active' | 'sold' | 'traded' = 'active';
  soldCoinsCount = 1;
  tradedCoinsCount = 1;
  showSettings = false;
  showEditProfile = false;
  newName = '';
  newPhotoUrl = '';
  currentUnit = 'Gramas (g)';
  currentCurrency = 'Euro (€)';
  notificationsEnabled = true;

  readonly currentProfile$: Observable<UserProfile | null> =
    this.authService.currentProfile$;
  readonly activeSection$: Observable<'home' | 'profile'> =
    this.activatedRoute.queryParamMap.pipe(
      map((params) => (params.get('nav') === 'profile' ? 'profile' : 'home')),
    );
  readonly catalog$ = this.marketplaceService.catalog$;
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
    this.catalog$,
    this.currentProfile$,
    this.marketplaceService.offers$,
  ]).pipe(
    map(([catalog, profile, offers]) => {
      if (!profile) {
        return [];
      }

      // Get user's own offers
      const myOffers = offers.filter((offer) => offer.ownerId === profile.id);

      // For each offer, try to find a matching catalog coin,
      // or create a virtual coin from the offer data
      const result = myOffers.map((offer) => {
        const catalogCoin = catalog.find((c) => c.id === offer.coinId);
        if (catalogCoin) {
          return { coin: catalogCoin, lastOffer: offer };
        }
        // Create a virtual coin from the offer metadata
        const photoUrl = offer.photos?.[0]?.dataUrl || 'assets/icon/coin-aureus.svg';
        const virtualCoin: Coin = {
          id: offer.coinId,
          name: offer.title || 'Moeda personalizada',
          sellerName: offer.ownerDisplayName,
          sellerRating: 0,
          emperor: offer.era || '',
          period: offer.era || '',
          material: '',
          conservation: offer.condition || '',
          location: '',
          origin: '',
          estimatedValue: offer.realValue || 0,
          description: offer.description || '',
          history: '',
          reference: '',
          image: photoUrl,
          tags: [],
        };
        return { coin: virtualCoin, lastOffer: offer };
      });

      return result.reverse();
    }),
  );
  readonly myNegotiations$ = combineLatest([
    this.currentProfile$,
    this.marketplaceService.negotiations$,
    this.marketplaceService.offers$,
    this.inventoryCards$,
  ]).pipe(
    map(([profile, threads, offers, cards]) => {
      if (!profile) {
        return [];
      }

      const normalizedDisplayName = profile.displayName.trim().toLowerCase();

      return [...threads]
        .filter((thread) => {
          const linkedOffer = offers.find(
            (offer) => offer.id === thread.offerId,
          );
          const isSeller = linkedOffer?.ownerId === profile.id;
          const isProposer =
            thread.proposerName.trim().toLowerCase() === normalizedDisplayName;

          return isSeller || isProposer;
        })
        .sort((left, right) => {
          const leftTimestamp =
            left.messages[left.messages.length - 1]?.sentAt ?? '';
          const rightTimestamp =
            right.messages[right.messages.length - 1]?.sentAt ?? '';
          return rightTimestamp.localeCompare(leftTimestamp);
        })
        .map((thread) => {
          const linkedOffer = offers.find(
            (offer) => offer.id === thread.offerId,
          );
          const isSeller = linkedOffer?.ownerId === profile.id;

          return {
            thread,
            coin: cards.find((item) => item.coin.id === thread.offerCoinId)
              ?.coin,
            counterpart: isSeller ? thread.proposerName : thread.sellerName,
            lastMessage:
              thread.messages[thread.messages.length - 1]?.body ??
              'Sem mensagens.',
            roleLabel: isSeller ? 'Como vendedor' : 'Como proponente',
          };
        });
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

  async ngOnInit(): Promise<void> {
    await this.authService.ensureInitialized();
    await this.marketplaceService.init();
  }

  setActiveTab(tab: 'active' | 'sold' | 'traded'): void {
    this.activeTab = tab;
  }

  openCoin(coin: Coin): void {
    void this.router.navigate(['/coin', coin.id], {
      queryParams: { from: 'perfil' },
    });
  }

  editCoin(item: { coin: Coin; lastOffer?: Offer }): void {
    if (!item.lastOffer) return;
    void this.router.navigate(['/tabs/tab2'], { queryParams: { offerId: item.lastOffer.id } });
  }

  async removeCoin(item: { coin: Coin; lastOffer?: Offer }): Promise<void> {
    if (!item.lastOffer) return;
    const alert = await this.alertController.create({
      header: 'Remover moeda',
      message: `Tens a certeza que queres remover "${item.coin.name}"?`,
      cssClass: 'light-alert-theme',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          handler: () => {
            void this.marketplaceService.removeOffer(item.lastOffer!.id).then(async () => {
              const toast = await this.toastController.create({
                message: 'Moeda removida com sucesso.',
                duration: 2000,
                color: 'success',
              });
              await toast.present();
            });
          },
        },
      ],
    });
    await alert.present();
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
    this.newPhotoUrl = (currentProfile as any)?.avatarUrl || '';
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

  getPriceLabel(item: { coin: Coin; lastOffer?: Offer }): string {
    if (item.lastOffer?.availableForTrade) {
      return 'Troca';
    }
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(item.lastOffer?.askPrice ?? item.coin.estimatedValue);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/'], { replaceUrl: true });
  }
}
