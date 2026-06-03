import { Component } from '@angular/core';

import { AuthService } from './core/services/auth.service';
import { DeviceService } from './core/services/device.service';
import { LocalStorageService } from './core/services/local-storage.service';
import { MarketplaceService } from './core/services/marketplace.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly deviceService: DeviceService,
    private readonly localStorageService: LocalStorageService,
    private readonly marketplaceService: MarketplaceService,
  ) {
    void this.bootstrapApplication();
  }

  /**
   * Initializes application-wide services once at startup.
   */
  private async bootstrapApplication(): Promise<void> {
    await this.localStorageService.init();
    await this.authService.ensureInitialized();
    await this.marketplaceService.init();
    await this.deviceService.lockPortrait();
  }
}
