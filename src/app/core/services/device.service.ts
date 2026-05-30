import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

/**
 * Centralizes device-oriented Capacitor integrations.
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  /**
   * Locks the application to portrait on native devices when supported.
   */
  async lockPortrait(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch {
      // Some devices or browsers can ignore orientation locks.
    }
  }
}
