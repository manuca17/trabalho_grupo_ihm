import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./tabs/tabs.module').then((m) => m.TabsPageModule),
  },
  {
    path: 'coin/:coinId',
    loadChildren: () =>
      import('./pages/coin-detail/coin-detail.module').then(
        (m) => m.CoinDetailPageModule,
      ),
  },
  {
    path: 'offer/:offerId',
    loadChildren: () =>
      import('./pages/offer-detail/offer-detail.module').then(
        (m) => m.OfferDetailPageModule,
      ),
  },
  {
    path: 'negotiation/:threadId',
    loadChildren: () =>
      import('./pages/negotiation-detail/negotiation-detail.module').then(
        (m) => m.NegotiationDetailPageModule,
      ),
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
