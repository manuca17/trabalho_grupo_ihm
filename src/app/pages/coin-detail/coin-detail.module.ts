import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { CoinDetailPageRoutingModule } from './coin-detail-routing.module';
import { CoinDetailPage } from './coin-detail.page';

@NgModule({
  imports: [CommonModule, IonicModule, CoinDetailPageRoutingModule],
  declarations: [CoinDetailPage],
})
export class CoinDetailPageModule {}
