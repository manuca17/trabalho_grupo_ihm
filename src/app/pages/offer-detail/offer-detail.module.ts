import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { OfferDetailPageRoutingModule } from './offer-detail-routing.module';
import { OfferDetailPage } from './offer-detail.page';

@NgModule({
  imports: [CommonModule, IonicModule, OfferDetailPageRoutingModule],
  declarations: [OfferDetailPage],
})
export class OfferDetailPageModule {}
