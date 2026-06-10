import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MakeOfferPage } from './make-offer.page';

const routes: Routes = [
  {
    path: '',
    component: MakeOfferPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MakeOfferPageRoutingModule {}