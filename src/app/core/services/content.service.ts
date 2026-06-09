import { Injectable } from '@angular/core';
import { Observable, defer, shareReplay } from 'rxjs';

import { AppStrings } from '../models/app-strings.model';
import { Coin, CoinModel } from '../models/coin.model';

import coinsData from '../../../assets/data/coins.json';
import appStringsData from '../../../assets/data/app-strings.json';

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  readonly coins$: Observable<Coin[]> = defer(() =>
    Promise.resolve(this.loadCoins()),
  ).pipe(shareReplay(1));

  readonly strings$: Observable<AppStrings> = defer(() =>
    Promise.resolve(this.loadStrings()),
  ).pipe(shareReplay(1));

  private loadCoins(): Coin[] {
    return (coinsData as Coin[]).map((coin) => new CoinModel(coin));
  }

  private loadStrings(): AppStrings {
    return appStringsData as AppStrings;
  }
}
