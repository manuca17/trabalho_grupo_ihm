import {
  UserProfileStats,
  UserProfileStatsModel,
} from './user-profile-stat.model';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  bio: string;
  interests: string[];
  avatarInitials: string;
  avatarUrl?: string; // NOVO: Propriedade opcional adicionada à interface
  createdAt: string;
  updatedAt: string;
  stats: UserProfileStats;
}

export class UserProfileModel implements UserProfile {
  id: string;
  displayName: string;
  email: string;
  bio: string;
  interests: string[];
  avatarInitials: string;
  avatarUrl?: string; // NOVO: Propriedade opcional adicionada à classe
  createdAt: string;
  updatedAt: string;
  stats: UserProfileStatsModel;

  constructor(data: UserProfile) {
    this.id = data.id;
    this.displayName = data.displayName;
    this.email = data.email;
    this.bio = data.bio;
    this.interests = [...(data.interests ?? [])];
    this.avatarInitials = data.avatarInitials;
    this.avatarUrl = data.avatarUrl || ''; // NOVO: Inicialização do campo
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.stats = UserProfileStatsModel.fromJson(data.stats);
  }

  static fromJson(data: UserProfile): UserProfileModel {
    return new UserProfileModel(data);
  }

  static fromJsonArray(
    data: UserProfile[] | null | undefined,
  ): UserProfileModel[] {
    return (data ?? []).map((item) => new UserProfileModel(item));
  }

  static createDefault(input: {
    id: string;
    displayName: string;
    email: string;
    interests?: string[];
    bio?: string;
    avatarUrl?: string; // NOVO: Suporte opcional no factory por defeito
  }): UserProfileModel {
    const now = new Date().toISOString();
    const displayName = input.displayName.trim();

    return new UserProfileModel({
      id: input.id,
      displayName,
      email: input.email.trim().toLowerCase(),
      bio:
        input.bio?.trim() ||
        'Colecionador registado na Ancient Coins Exchange.',
      interests: [...(input.interests ?? [])],
      avatarInitials: UserProfileModel.buildInitials(displayName),
      avatarUrl: input.avatarUrl || '', // NOVO: Mapeia string vazia ou imagem informada
      createdAt: now,
      updatedAt: now,
      stats: UserProfileStatsModel.createDefault().toPlainObject(),
    });
  }

  static buildInitials(displayName: string): string {
    return displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('');
  }

  toPlainObject(): UserProfile {
    return {
      id: this.id,
      displayName: this.displayName,
      email: this.email,
      bio: this.bio,
      interests: [...this.interests],
      avatarInitials: this.avatarInitials,
      avatarUrl: this.avatarUrl || '', // NOVO: Expõe a propriedade no objeto simples
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      stats: this.stats.toPlainObject(),
    };
  }
}