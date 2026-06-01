import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
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
  {
    path: '',
    loadChildren: () =>
      import('./tabs/tabs.module').then((m) => m.TabsPageModule),
  },
  // Fallback seguro caso tentem entrar numa rota inexistente
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
