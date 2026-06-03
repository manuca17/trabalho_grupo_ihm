/**
 * Represents the three guided photos requested in the new offer flow.
 */
export interface OfferPhoto {
  kind: 'obverse' | 'reverse' | 'edge';
  label: string;
  dataUrl: string;
  brightness: number;
}

export class OfferPhotoModel implements OfferPhoto {
  kind: 'obverse' | 'reverse' | 'edge';
  label: string;
  dataUrl: string;
  brightness: number;

  constructor(data: OfferPhoto) {
    this.kind = data.kind;
    this.label = data.label;
    this.dataUrl = data.dataUrl;
    this.brightness = data.brightness;
  }

  static fromJson(data: OfferPhoto): OfferPhotoModel {
    return new OfferPhotoModel(data);
  }

  static fromJsonArray(
    data: OfferPhoto[] | null | undefined,
  ): OfferPhotoModel[] {
    return (data ?? []).map((item) => new OfferPhotoModel(item));
  }

  toPlainObject(): OfferPhoto {
    return {
      kind: this.kind,
      label: this.label,
      dataUrl: this.dataUrl,
      brightness: this.brightness,
    };
  }
}
