import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { NegotiationDetailPageRoutingModule } from './negotiation-detail-routing.module';
import { NegotiationDetailPage } from './negotiation-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NegotiationDetailPageRoutingModule,
  ],
  declarations: [NegotiationDetailPage],
})
export class NegotiationDetailPageModule {}
