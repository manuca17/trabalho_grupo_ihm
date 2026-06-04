import { Coin, CoinModel } from '../../models/coin.model';
import {
    NegotiationMessage,
    NegotiationMessageModel,
} from '../../models/negotiation-message.model';
import {
    NegotiationThread,
    NegotiationThreadModel,
} from '../../models/negotiation-thread.model';
import { OfferPhoto, OfferPhotoModel } from '../../models/offer-photo.model';
import { Offer, OfferModel } from '../../models/offer.model';
import {
    FirestoreDateValue,
    normalizeFirestoreDate,
} from './firestore-date.helper';

export interface FirestoreCoinDto {
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

export interface FirestoreOfferPhotoDto {
  kind: 'obverse' | 'reverse' | 'edge';
  label: string;
  dataUrl: string;
  brightness: number;
}

export interface FirestoreOfferDto {
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
  photos: FirestoreOfferPhotoDto[];
  status: 'draft' | 'published' | 'negotiating' | 'traded';
  createdAt: FirestoreDateValue;
}

export interface FirestoreNegotiationMessageDto {
  userId: string;
  displayName: string;
  body: string;
  sentAt: FirestoreDateValue;
}

export interface FirestoreNegotiationThreadDto {
  offerId: string;
  offerCoinId: string;
  proposerCoinId: string;
  proposerName: string;
  sellerName: string;
  status: 'pending' | 'accepted' | 'traded';
  realValue: number;
  unreadCount: number;
  messages: Array<FirestoreNegotiationMessageDto & { id?: string }>;
}

export function mapCoinFromFirestore(
  id: string,
  dto: FirestoreCoinDto,
): CoinModel {
  return new CoinModel({
    id,
    name: dto.name,
    sellerName: dto.sellerName,
    sellerRating: dto.sellerRating,
    emperor: dto.emperor,
    period: dto.period,
    material: dto.material,
    conservation: dto.conservation,
    location: dto.location,
    origin: dto.origin,
    weight: dto.weight,
    diameter: dto.diameter,
    estimatedValue: dto.estimatedValue,
    description: dto.description,
    history: dto.history,
    reference: dto.reference,
    image: dto.image,
    images: dto.images,
    tags: [...(dto.tags ?? [])],
  });
}

export function mapCoinToFirestore(coin: Coin): FirestoreCoinDto {
  return {
    name: coin.name,
    sellerName: coin.sellerName,
    sellerRating: coin.sellerRating,
    emperor: coin.emperor,
    period: coin.period,
    material: coin.material,
    conservation: coin.conservation,
    location: coin.location,
    origin: coin.origin,
    weight: coin.weight,
    diameter: coin.diameter,
    estimatedValue: coin.estimatedValue,
    description: coin.description,
    history: coin.history,
    reference: coin.reference,
    image: coin.image,
    images: {
      obverse: coin.images?.obverse ?? coin.image,
      reverse: coin.images?.reverse ?? coin.image,
      edge: coin.images?.edge ?? coin.image,
    },
    tags: [...(coin.tags ?? [])],
  };
}

export function mapOfferPhotoFromFirestore(
  dto: FirestoreOfferPhotoDto,
): OfferPhotoModel {
  return new OfferPhotoModel(dto);
}

export function mapOfferPhotoToFirestore(
  photo: OfferPhoto,
): FirestoreOfferPhotoDto {
  return {
    kind: photo.kind,
    label: photo.label,
    dataUrl: photo.dataUrl,
    brightness: photo.brightness,
  };
}

export function mapOfferFromFirestore(
  id: string,
  dto: FirestoreOfferDto,
): OfferModel {
  return new OfferModel({
    id,
    coinId: dto.coinId,
    ownerId: dto.ownerId,
    ownerDisplayName: dto.ownerDisplayName,
    title: dto.title ?? '',
    quantity: dto.quantity,
    askPrice: dto.askPrice,
    description: dto.description,
    era: dto.era ?? '',
    condition: dto.condition ?? '',
    realValue: dto.realValue ?? 0,
    availableForTrade: dto.availableForTrade,
    photos: (dto.photos ?? []).map(mapOfferPhotoFromFirestore),
    status: dto.status,
    createdAt: normalizeFirestoreDate(dto.createdAt),
  });
}

export function mapOfferToFirestore(offer: Offer): FirestoreOfferDto {
  return {
    coinId: offer.coinId,
    ownerId: offer.ownerId,
    ownerDisplayName: offer.ownerDisplayName,
    title: offer.title,
    quantity: offer.quantity,
    askPrice: offer.askPrice,
    description: offer.description,
    era: offer.era,
    condition: offer.condition,
    realValue: offer.realValue,
    availableForTrade: offer.availableForTrade,
    photos: (offer.photos ?? []).map(mapOfferPhotoToFirestore),
    status: offer.status,
    createdAt: offer.createdAt,
  };
}

export function mapNegotiationMessageFromFirestore(
  id: string,
  dto: FirestoreNegotiationMessageDto,
): NegotiationMessageModel {
  return new NegotiationMessageModel({
    id,
    userId: dto.userId,
    displayName: dto.displayName,
    body: dto.body,
    sentAt: normalizeFirestoreDate(dto.sentAt),
  });
}

export function mapNegotiationMessageToFirestore(
  message: NegotiationMessage,
): FirestoreNegotiationMessageDto & { id: string } {
  return {
    id: message.id,
    userId: message.userId,
    displayName: message.displayName,
    body: message.body,
    sentAt: message.sentAt,
  };
}

export function mapNegotiationThreadFromFirestore(
  id: string,
  dto: FirestoreNegotiationThreadDto,
): NegotiationThreadModel {
  return new NegotiationThreadModel({
    id,
    offerId: dto.offerId,
    offerCoinId: dto.offerCoinId,
    proposerCoinId: dto.proposerCoinId,
    proposerName: dto.proposerName,
    sellerName: dto.sellerName,
    status: dto.status,
    realValue: dto.realValue,
    unreadCount: dto.unreadCount,
    messages: (dto.messages ?? []).map((message, index) =>
      mapNegotiationMessageFromFirestore(
        message.id ?? `${id}-message-${index}`,
        message,
      ),
    ),
  });
}

export function mapNegotiationThreadToFirestore(
  thread: NegotiationThread,
): FirestoreNegotiationThreadDto {
  return {
    offerId: thread.offerId,
    offerCoinId: thread.offerCoinId,
    proposerCoinId: thread.proposerCoinId,
    proposerName: thread.proposerName,
    sellerName: thread.sellerName,
    status: thread.status,
    realValue: thread.realValue,
    unreadCount: thread.unreadCount,
    messages: (thread.messages ?? []).map(mapNegotiationMessageToFirestore),
  };
}
