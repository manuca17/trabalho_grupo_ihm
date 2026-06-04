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
type MyNegotiationCard = {
  thread: NegotiationThread;
  coin?: Coin;
  counterpart: string;
  lastMessage: string;
  roleLabel: string;
};

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
export class Tab5Page {
  activeTab: 'active' | 'sold' | 'traded' = 'active';
  soldCoinsCount = 1;
  tradedCoinsCount = 1;
  showSettings: boolean = false;
  showEditProfile: boolean = false;

  currentUnit: string = 'Gramas (g)';
  notificationsEnabled: boolean = true;
  
  newName: string = '';
  newPhotoUrl: string = '';

  readonly currentProfile$: Observable<UserProfile | null> = this.authService.currentProfile$;
  readonly activeSection$: Observable<'home' | 'profile'> = this.activatedRoute.queryParamMap.pipe(
    map((params) => (params.get('nav') === 'profile' ? 'profile' : 'home')),
  );
  readonly inventoryCards$ = this.marketplaceService.inventoryCards$;
  readonly featuredCoins$ = this.inventoryCards$.pipe(map((cards) => cards.slice(0, 4)));
  
  readonly recentlyAdded$ = this.inventoryCards$.pipe(
    map((cards) =>
      [...cards]
        .reverse()
        .slice(0, 2)
        .map((item, index) => ({
          ...item,
          timeLabel: index === 0 ? 'Há 2 horas' : 'Há 5 horas',
        })),
    ),
  );
  
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
  
  readonly myNegotiations$ = combineLatest([
    this.currentProfile$,
    this.marketplaceService.negotiations$,
    this.marketplaceService.offers$,
    this.inventoryCards$,
  ]).pipe(
    map(([profile, threads, offers, cards]) => {
      if (!profile) return [];
      const normalizedDisplayName = profile.displayName.trim().toLowerCase();

      return [...threads]
        .filter((thread) => {
          const linkedOffer = offers.find((offer) => offer.id === thread.offerId);
          const isSeller = linkedOffer?.ownerId === profile.id;
          const isProposer = thread.proposerName.trim().toLowerCase() === normalizedDisplayName;
          return isSeller || isProposer;
        })
        .sort((left, right) => {
          const leftTimestamp = left.messages[left.messages.length - 1]?.sentAt ?? '';
          const rightTimestamp = right.messages[right.messages.length - 1]?.sentAt ?? '';
          return rightTimestamp.localeCompare(leftTimestamp);
        })
        .map((thread) => {
          const linkedOffer = offers.find((offer) => offer.id === thread.offerId);
          const isSeller = linkedOffer?.ownerId === profile.id;

          return {
            thread,
            coin: cards.find((item) => item.coin.id === thread.offerCoinId)?.coin,
            counterpart: isSeller ? thread.proposerName : thread.sellerName,
            lastMessage: thread.messages[thread.messages.length - 1]?.body ?? 'Sem mensagens.',
            roleLabel: isSeller ? 'Como vendedor' : 'Como proponente',
          } as MyNegotiationCard;
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

  openAddOffer(): void {
    void this.router.navigate(['/tabs/tab2']);
  }

  openMessages(): void {
    void this.router.navigate(['/tabs/tab4']);
  }

  openNegotiation(thread: NegotiationThread): void {
    void this.router.navigate(['/negotiation', thread.id], {
      queryParams: { offerId: thread.offerId },
    });
  }

  getPriceLabel(item: InventoryCard): string {
    if (item.lastOffer?.availableForTrade) return 'Troca';
    return EUR_FORMATTER.format(item.lastOffer?.askPrice ?? item.coin.estimatedValue);
  }

  isTrade(item: InventoryCard): boolean {
    return !!item.lastOffer?.availableForTrade;
  }

  openEditProfile() {
    this.showEditProfile = true;
    const currentProfile = this.authService.currentProfileSnapshot;
    this.newName = currentProfile?.displayName || '';
    this.newPhotoUrl = currentProfile?.avatarUrl || '';
  }

  closeEditProfile() {
    this.showEditProfile = false;
  }

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

  // ATUALIZADO: Agora notifica reativamente o MarketplaceService da alteração de peso global
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
              // Altera o fluxo matemático dinâmico de todas as moedas da app
              const unitKey = data === 'Gramas (g)' ? 'g' : 'oz';
              this.marketplaceService.updateActiveUnit(unitKey);
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
      message: this.notificationsEnabled ? 'Notificações de propostas ativadas.' : 'Notificações de propostas desativadas.',
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