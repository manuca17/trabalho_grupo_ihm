import { OfferPhoto, OfferPhotoModel } from './offer-photo.model';

/**
 * Represents an offer published from the collector inventory.
 */
export interface Offer {
  id: string;
  coinId: string;
  quantity: number;
  askPrice: number;
  description: string;
  availableForTrade: boolean;
  photos: OfferPhoto[];
  status: 'draft' | 'published' | 'negotiating' | 'traded';
  createdAt: string;
}

export class OfferModel implements Offer {
  id: string;
  coinId: string;
  quantity: number;
  askPrice: number;
  description: string;
  availableForTrade: boolean;
  photos: OfferPhotoModel[];
  status: 'draft' | 'published' | 'negotiating' | 'traded';
  createdAt: string;

  constructor(data: Offer) {
    this.id = data.id;
    this.coinId = data.coinId;
    this.quantity = data.quantity;
    this.askPrice = data.askPrice;
    this.description = data.description;
    this.availableForTrade = data.availableForTrade;
    this.photos = OfferPhotoModel.fromJsonArray(data.photos);
    this.status = data.status;
    this.createdAt = data.createdAt;
  }

  static fromJson(data: Offer): OfferModel {
    return new OfferModel(data);
  }

  static fromJsonArray(data: Offer[] | null | undefined): OfferModel[] {
    return (data ?? []).map((item) => new OfferModel(item));
  }

  toPlainObject(): Offer {
    return {
      id: this.id,
      coinId: this.coinId,
      quantity: this.quantity,
      askPrice: this.askPrice,
      description: this.description,
      availableForTrade: this.availableForTrade,
      photos: this.photos.map((photo) => photo.toPlainObject()),
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}
