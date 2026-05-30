import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

/**
 * Wraps Ionic Storage lifecycle and typed access helpers.
 */
@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private storageReady?: Promise<Storage>;

  constructor(private readonly storage: Storage) {}

  /**
   * Ensures the storage engine is available before first use.
   */
  init(): Promise<Storage> {
    if (!this.storageReady) {
      this.storageReady = this.storage.create();
    }

    return this.storageReady;
  }

  /**
   * Reads a typed value from storage.
   */
  async getItem<T>(key: string): Promise<T | null> {
    const instance = await this.init();
    return instance.get(key);
  }

  /**
   * Persists a typed value to storage.
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    const instance = await this.init();
    await instance.set(key, value);
  }
}
