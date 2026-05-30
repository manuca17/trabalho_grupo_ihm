import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { AppStrings } from '../models/app-strings.model';
import { Coin, NegotiationThread } from '../models/coin.model';

/**
 * Loads static seed content from JSON files placed in the assets folder.
 */
@Injectable({
  providedIn: 'root',
})
export class ContentService {
  readonly coins$: Observable<Coin[]> = this.http
    .get<Coin[]>('assets/data/coins.json')
    .pipe(shareReplay(1));

  readonly strings$: Observable<AppStrings> = this.http
    .get<AppStrings>('assets/data/app-strings.json')
    .pipe(shareReplay(1));

  readonly negotiationSeeds$: Observable<NegotiationThread[]> = this.http
    .get<NegotiationThread[]>('assets/data/conversations.json')
    .pipe(shareReplay(1));

  constructor(private readonly http: HttpClient) {}
}
