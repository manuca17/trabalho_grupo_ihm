import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { AppStrings } from '../core/models/app-strings.model';
import { Coin, Offer } from '../core/models/coin.model';
import { MarketplaceService } from '../core/services/marketplace.service';
import { StringsService } from '../core/services/strings.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  readonly inventoryCards$ = this.marketplaceService.inventoryCards$;
  readonly strings$: Observable<AppStrings> = this.stringsService.strings$;

  constructor(
    private readonly router: Router,
    private readonly marketplaceService: MarketplaceService,
    private readonly stringsService: StringsService,
  ) {}

  openCoin(coin: Coin): void {
    void this.router.navigate(['/coin', coin.id], {
      queryParams: {
        from: 'inventario',
      },
    });
  }

  getOfferStateLabel(offer?: Offer): string {
    if (!offer) {
      return 'Sem oferta publicada';
    }

    if (offer.status === 'traded') {
      return 'Última oferta concluída';
    }

    return 'Oferta pronta a negociar';
  }
}
