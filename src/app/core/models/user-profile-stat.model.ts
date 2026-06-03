export interface UserProfileStats {
  publishedOffers: number;
  completedTrades: number;
  favoritesCount: number;
  rating: number;
}

export class UserProfileStatsModel implements UserProfileStats {
  publishedOffers: number;
  completedTrades: number;
  favoritesCount: number;
  rating: number;

  constructor(data: UserProfileStats) {
    this.publishedOffers = data.publishedOffers;
    this.completedTrades = data.completedTrades;
    this.favoritesCount = data.favoritesCount;
    this.rating = data.rating;
  }

  static createDefault(): UserProfileStatsModel {
    return new UserProfileStatsModel({
      publishedOffers: 0,
      completedTrades: 0,
      favoritesCount: 0,
      rating: 5,
    });
  }

  static fromJson(data: UserProfileStats): UserProfileStatsModel {
    return new UserProfileStatsModel(data);
  }

  toPlainObject(): UserProfileStats {
    return {
      publishedOffers: this.publishedOffers,
      completedTrades: this.completedTrades,
      favoritesCount: this.favoritesCount,
      rating: this.rating,
    };
  }
}
