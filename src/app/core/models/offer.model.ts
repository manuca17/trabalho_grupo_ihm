import { OfferPhoto, OfferPhotoModel } from './offer-photo.model';

/**
 * Represents an offer published from the collector inventory.
 */
export interface Offer {
  id: string;
  coinId: string;
  ownerId: string;
  ownerDisplayName?: string;
  title: string;
  quantity: number;
  askPrice: number;
  description: string;
  era: string;
  condition: string;
  realValue: number;
  availableForTrade: boolean;
  photos: OfferPhoto[];
  status: 'draft' | 'published' | 'negotiating' | 'traded';
  createdAt: string;
  weight?: string;
  diameter?: string;
  material?: string;
  origin?: string;
  history?: string;
  reference?: string;
  location?: string;
}

export class OfferModel implements Offer {
  id: string;
  coinId: string;
  ownerId: string;
  ownerDisplayName?: string;
  title: string;
  quantity: number;
  askPrice: number;
  description: string;
  era: string;
  condition: string;
  realValue: number;
  availableForTrade: boolean;
  photos: OfferPhotoModel[];
  status: 'draft' | 'published' | 'negotiating' | 'traded';
  createdAt: string;
  weight?: string;
  diameter?: string;
  material?: string;
  origin?: string;
  history?: string;
  reference?: string;
  location?: string;

  constructor(data: Offer) {
    this.id = data.id;
    this.coinId = data.coinId;
    this.ownerId = data.ownerId;
    this.ownerDisplayName = data.ownerDisplayName;
    this.title = data.title;
    this.quantity = data.quantity;
    this.askPrice = data.askPrice;
    this.description = data.description;
    this.era = data.era;
    this.condition = data.condition;
    this.realValue = data.realValue;
    this.availableForTrade = data.availableForTrade;
    this.photos = OfferPhotoModel.fromJsonArray(data.photos);
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.weight = data.weight;
    this.diameter = data.diameter;
    this.material = data.material;
    this.origin = data.origin;
    this.history = data.history;
    this.reference = data.reference;
    this.location = data.location;
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
      ownerId: this.ownerId,
      ownerDisplayName: this.ownerDisplayName,
      title: this.title,
      quantity: this.quantity,
      askPrice: this.askPrice,
      description: this.description,
      era: this.era,
      condition: this.condition,
      realValue: this.realValue,
      availableForTrade: this.availableForTrade,
      photos: this.photos.map((photo) => photo.toPlainObject()),
      status: this.status,
      createdAt: this.createdAt,
      weight: this.weight,
      diameter: this.diameter,
      material: this.material,
      origin: this.origin,
      history: this.history,
      reference: this.reference,
      location: this.location,
    };
  }
}
