import {
    NegotiationMessage,
    NegotiationMessageModel,
} from './negotiation-message.model';

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

export class NegotiationThreadModel implements NegotiationThread {
  id: string;
  offerId: string;
  offerCoinId: string;
  proposerCoinId: string;
  proposerName: string;
  sellerName: string;
  status: 'pending' | 'accepted' | 'traded';
  realValue: number;
  unreadCount: number;
  messages: NegotiationMessageModel[];

  constructor(data: NegotiationThread) {
    this.id = data.id;
    this.offerId = data.offerId;
    this.offerCoinId = data.offerCoinId;
    this.proposerCoinId = data.proposerCoinId;
    this.proposerName = data.proposerName;
    this.sellerName = data.sellerName;
    this.status = data.status;
    this.realValue = data.realValue;
    this.unreadCount = data.unreadCount;
    this.messages = NegotiationMessageModel.fromJsonArray(data.messages);
  }

  static fromJson(data: NegotiationThread): NegotiationThreadModel {
    return new NegotiationThreadModel(data);
  }

  static fromJsonArray(
    data: NegotiationThread[] | null | undefined,
  ): NegotiationThreadModel[] {
    return (data ?? []).map((item) => new NegotiationThreadModel(item));
  }

  toPlainObject(): NegotiationThread {
    return {
      id: this.id,
      offerId: this.offerId,
      offerCoinId: this.offerCoinId,
      proposerCoinId: this.proposerCoinId,
      proposerName: this.proposerName,
      sellerName: this.sellerName,
      status: this.status,
      realValue: this.realValue,
      unreadCount: this.unreadCount,
      messages: this.messages.map((message) => message.toPlainObject()),
    };
  }
}
