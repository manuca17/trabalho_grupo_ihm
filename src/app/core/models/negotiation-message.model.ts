/**
 * Represents a chat message inside a trade negotiation.
 */
export interface NegotiationMessage {
  id: string;
  author: 'Carlos' | 'Maria' | 'Sistema';
  body: string;
  sentAt: string;
}

export class NegotiationMessageModel implements NegotiationMessage {
  id: string;
  author: 'Carlos' | 'Maria' | 'Sistema';
  body: string;
  sentAt: string;

  constructor(data: NegotiationMessage) {
    this.id = data.id;
    this.author = data.author;
    this.body = data.body;
    this.sentAt = data.sentAt;
  }

  static fromJson(data: NegotiationMessage): NegotiationMessageModel {
    return new NegotiationMessageModel(data);
  }

  static fromJsonArray(
    data: NegotiationMessage[] | null | undefined,
  ): NegotiationMessageModel[] {
    return (data ?? []).map((item) => new NegotiationMessageModel(item));
  }

  toPlainObject(): NegotiationMessage {
    return {
      id: this.id,
      author: this.author,
      body: this.body,
      sentAt: this.sentAt,
    };
  }
}
