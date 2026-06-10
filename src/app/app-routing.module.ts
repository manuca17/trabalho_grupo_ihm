import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./pages/register/register.module').then(
        (m) => m.RegisterPageModule,
      ),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./tabs/tabs.module').then((m) => m.TabsPageModule),
  },
  {
    path: 'coin/:coinId',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./pages/coin-detail/coin-detail.module').then(
        (m) => m.CoinDetailPageModule,
      ),
  },
  {
    path: 'offer/:offerId',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./pages/offer-detail/offer-detail.module').then(
        (m) => m.OfferDetailPageModule,
      ),
  },
  {
    path: 'make-offer',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./pages/make-offer/make-offer.module').then(
        (m) => m.MakeOfferPageModule,
      ),
  },
  {
    path: 'negotiation/:threadId',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./pages/negotiation-detail/negotiation-detail.module').then(
        (m) => m.NegotiationDetailPageModule,
      ),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  // Fallback seguro caso tentem entrar numa rota inexistente
  {
    path: '**',
    redirectTo: 'login',
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
