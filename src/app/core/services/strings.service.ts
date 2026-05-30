import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppStrings } from '../models/app-strings.model';
import { ContentService } from './content.service';

/**
 * Exposes UI text loaded from JSON so pages do not hardcode copy everywhere.
 */
@Injectable({
  providedIn: 'root',
})
export class StringsService {
  readonly strings$: Observable<AppStrings> = this.contentService.strings$;

  constructor(private readonly contentService: ContentService) {}
}
