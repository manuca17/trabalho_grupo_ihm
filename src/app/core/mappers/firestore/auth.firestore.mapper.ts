import {
    AuthAccountRecord,
    AuthAccountRecordModel,
    AuthSession,
    AuthSessionModel,
    UserProfile,
    UserProfileModel,
} from '../../models/auth.model';
import {
    FirestoreDateValue,
    normalizeFirestoreDate,
} from './firestore-date.helper';

export interface FirestoreUserProfileStatsDto {
  publishedOffers: number;
  completedTrades: number;
  favoritesCount: number;
  rating: number;
}

export interface FirestoreUserProfileDto {
  displayName: string;
  email: string;
  bio: string;
  interests: string[];
  avatarInitials: string;
  avatarUrl?: string; // Mapeado no DTO do documento Firestore
  createdAt: FirestoreDateValue;
  updatedAt: FirestoreDateValue;
  stats: FirestoreUserProfileStatsDto;
}

export interface FirestoreAuthSessionDto {
  userId: string;
  email: string;
  displayName: string;
  provider: 'password' | 'demo';
  loggedInAt: FirestoreDateValue;
}

export interface FirestoreAuthAccountDto {
  userId: string;
  email: string;
  passwordHash: string;
  provider: 'password' | 'demo';
  createdAt: FirestoreDateValue;
  lastLoginAt?: FirestoreDateValue;
}

export function mapUserProfileFromFirestore(
  id: string,
  dto: FirestoreUserProfileDto,
): UserProfileModel {
  return new UserProfileModel({
    id,
    displayName: dto.displayName,
    email: dto.email,
    bio: dto.bio,
    interests: [...(dto.interests ?? [])],
    avatarInitials: dto.avatarInitials,
    avatarUrl: dto.avatarUrl || '', // Extrai do Firestore para a app
    createdAt: normalizeFirestoreDate(dto.createdAt),
    updatedAt: normalizeFirestoreDate(dto.updatedAt),
    stats: dto.stats,
  });
}

export function mapUserProfileToFirestore(
  profile: UserProfile,
): FirestoreUserProfileDto {
  return {
    displayName: profile.displayName,
    email: profile.email,
    bio: profile.bio,
    interests: [...(profile.interests ?? [])],
    avatarInitials: profile.avatarInitials,
    avatarUrl: profile.avatarUrl || '', // Grava da app para o Firestore
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    stats: {
      publishedOffers: profile.stats.publishedOffers,
      completedTrades: profile.stats.completedTrades,
      favoritesCount: profile.stats.favoritesCount,
      rating: profile.stats.rating,
    },
  };
}

export function mapAuthSessionFromFirestore(
  dto: FirestoreAuthSessionDto,
): AuthSessionModel {
  return new AuthSessionModel({
    userId: dto.userId,
    email: dto.email,
    displayName: dto.displayName,
    provider: dto.provider,
    loggedInAt: normalizeFirestoreDate(dto.loggedInAt),
  });
}

export function mapAuthSessionToFirestore(
  session: AuthSession,
): FirestoreAuthSessionDto {
  return {
    userId: session.userId,
    email: session.email,
    displayName: session.displayName,
    provider: session.provider,
    loggedInAt: session.loggedInAt,
  };
}

export function mapAuthAccountFromFirestore(
  dto: FirestoreAuthAccountDto,
): AuthAccountRecordModel {
  return new AuthAccountRecordModel({
    userId: dto.userId,
    email: dto.email,
    passwordHash: dto.passwordHash,
    provider: dto.provider,
    createdAt: normalizeFirestoreDate(dto.createdAt),
    lastLoginAt: dto.lastLoginAt
      ? normalizeFirestoreDate(dto.lastLoginAt)
      : undefined,
  });
}

export function mapAuthAccountToFirestore(
  account: AuthAccountRecord,
): FirestoreAuthAccountDto {
  return {
    userId: account.userId,
    email: account.email,
    passwordHash: account.passwordHash,
    provider: account.provider,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt,
  };
}