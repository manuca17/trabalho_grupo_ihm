/**
 * Represents a collectible coin available in the digital inventory.
 */
export interface Coin {
  id: string;
  name: string;
  emperor: string;
  period: string;
  material: string;
  conservation: string;
  location: string;
  estimatedValue: number;
  description: string;
  image: string;
  tags: string[];
}

/**
 * Represents the three guided photos requested in the new offer flow.
 */
export interface OfferPhoto {
  kind: 'obverse' | 'reverse' | 'edge';
  label: string;
  dataUrl: string;
  brightness: number;
}

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

/**
 * Represents a chat message inside a trade negotiation.
 */
export interface NegotiationMessage {
  id: string;
  author: 'Carlos' | 'Maria' | 'Sistema';
  body: string;
  sentAt: string;
}

/**
 * Represents a local negotiation thread between collectors.
 */
export interface NegotiationThread {
  id: string;
  offerId: string;
  offerCoinId: string;
  proposerCoinId: string;
  proposerName: string;
  sellerName: string;
  status: 'pending' | 'accepted' | 'traded';
  realValue: number;
  unreadCount: number;
  messages: NegotiationMessage[];
}
