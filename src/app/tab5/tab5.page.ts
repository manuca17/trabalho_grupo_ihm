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
          timeLabel: index === 0 ? 'Ha 2 horas' : 'Ha 5 horas',
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

  // Ajustado para passar a flag 'perfil' no retorno
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
  }

  closeSettings(): void {
    this.showSettings = false;
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

  async triggerEditProfile() {
    const toast = await this.toastController.create({
      message: 'Funcionalidade de Edição de Perfil em desenvolvimento.',
      duration: 2000,
      position: 'bottom',
      color: 'warning'
    });
    await toast.present();
  }

  // Tema CSS injetado diretamente na propriedade 'cssClass'
  async triggerChangeUnit() {
    const alert = await this.alertController.create({
      header: 'Unidade de Medida',
      cssClass: 'orange-alert-theme',
      inputs: [
        { type: 'radio', label: 'Gramas (g)', value: 'g', checked: true },
        { type: 'radio', label: 'Onças (oz)', value: 'oz' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async (data) => {
            const toast = await this.toastController.create({
              message: `Unidade alterada para: ${data === 'g' ? 'Gramas' : 'Onças'}`,
              duration: 1500,
              color: 'success'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  async triggerNotifications() {
    const toast = await this.toastController.create({
      message: 'Definições de notificações sincronizadas com o dispositivo.',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/'], { replaceUrl: true });
  }
}