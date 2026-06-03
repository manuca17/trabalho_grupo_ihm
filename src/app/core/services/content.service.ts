import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, defer, shareReplay } from 'rxjs';

import {
  FirestoreCoinDto,
  mapCoinFromFirestore,
} from '../mappers/firestore/marketplace.firestore.mapper';
import { AppStrings } from '../models/app-strings.model';
import { Coin } from '../models/coin.model';

const COINS_COLLECTION = 'coins';
const APP_STRINGS_COLLECTION = 'app_strings';
const APP_STRINGS_DOCUMENT = 'default';

/**
 * Loads shared application content from Firestore.
 */
@Injectable({
  providedIn: 'root',
})
export class ContentService {
  readonly coins$: Observable<Coin[]> = defer(() =>
    this.loadCoinsFromFirestore(),
  ).pipe(shareReplay(1));

  readonly strings$: Observable<AppStrings> = defer(() =>
    this.loadStringsFromFirestore(),
  ).pipe(shareReplay(1));

  constructor(private readonly firestore: Firestore) {}

  private async loadCoinsFromFirestore(): Promise<Coin[]> {
    const snapshot = await getDocs(
      collection(this.firestore, COINS_COLLECTION),
    );

    return snapshot.docs.map((item) =>
      mapCoinFromFirestore(item.id, item.data() as FirestoreCoinDto),
    );
  }

  private async loadStringsFromFirestore(): Promise<AppStrings> {
    const snapshot = await getDoc(
      doc(this.firestore, APP_STRINGS_COLLECTION, APP_STRINGS_DOCUMENT),
    );

    if (!snapshot.exists()) {
      throw new Error(
        'Documento app_strings/default em falta na Firestore. Executa npm run seed:all.',
      );
    }

    return snapshot.data() as AppStrings;
  }
}
