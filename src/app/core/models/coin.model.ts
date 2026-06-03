/**
 * Represents a collectible coin available in the digital inventory.
 */
export interface Coin {
  id: string;
  name: string;
  sellerName?: string;
  sellerRating?: number;
  emperor: string;
  period: string;
  material: string;
  conservation: string;
  location: string;
  origin?: string;
  weight?: string;
  diameter?: string;
  estimatedValue: number;
  description: string;
  history?: string;
  reference?: string;
  image: string;
  images?: {
    obverse: string;
    reverse: string;
    edge: string;
  };
  tags: string[];
}

export class CoinModel implements Coin {
  id: string;
  name: string;
  sellerName?: string;
  sellerRating?: number;
  emperor: string;
  period: string;
  material: string;
  conservation: string;
  location: string;
  origin?: string;
  weight?: string;
  diameter?: string;
  estimatedValue: number;
  description: string;
  history?: string;
  reference?: string;
  image: string;
  images: {
    obverse: string;
    reverse: string;
    edge: string;
  };
  tags: string[];

  constructor(data: Coin) {
    this.id = data.id;
    this.name = data.name;
    this.sellerName = data.sellerName;
    this.sellerRating = data.sellerRating;
    this.emperor = data.emperor;
    this.period = data.period;
    this.material = data.material;
    this.conservation = data.conservation;
    this.location = data.location;
    this.origin = data.origin;
    this.weight = data.weight;
    this.diameter = data.diameter;
    this.estimatedValue = data.estimatedValue;
    this.description = data.description;
    this.history = data.history;
    this.reference = data.reference;
    this.image = data.images?.obverse ?? data.image;
    this.images = {
      obverse: data.images?.obverse ?? data.image,
      reverse: data.images?.reverse ?? data.image,
      edge: data.images?.edge ?? data.image,
    };
    this.tags = [...(data.tags ?? [])];
  }

  static fromJson(data: Coin): CoinModel {
    return new CoinModel(data);
  }

  static fromJsonArray(data: Coin[] | null | undefined): CoinModel[] {
    return (data ?? []).map((item) => new CoinModel(item));
  }

  toPlainObject(): Coin {
    return {
      id: this.id,
      name: this.name,
      sellerName: this.sellerName,
      sellerRating: this.sellerRating,
      emperor: this.emperor,
      period: this.period,
      material: this.material,
      conservation: this.conservation,
      location: this.location,
      origin: this.origin,
      weight: this.weight,
      diameter: this.diameter,
      estimatedValue: this.estimatedValue,
      description: this.description,
      history: this.history,
      reference: this.reference,
      image: this.image,
      images: { ...this.images },
      tags: [...this.tags],
    };
  }
}

export * from './negotiation-message.model';
export * from './negotiation-thread.model';
export * from './offer-photo.model';
export * from './offer.model';

