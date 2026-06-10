import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  AuthAccountRecord,
  AuthAccountRecordModel,
  AuthSession,
  AuthSessionModel,
  LoginCredentials,
  LoginCredentialsModel,
  RegisterAccountInput,
  RegisterAccountInputModel,
  UserProfile,
  UserProfileModel,
} from '../models/auth.model';
import { LocalStorageService } from './local-storage.service';

const LS_ACCOUNTS_KEY = 'ls_accounts';
const LS_USERS_KEY = 'ls_users';
const LS_SESSION_KEY = 'ls_session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authenticatedSubject = new BehaviorSubject(false);
  private readonly currentSessionSubject =
    new BehaviorSubject<AuthSession | null>(null);
  private readonly currentProfileSubject =
    new BehaviorSubject<UserProfile | null>(null);
  private initializationPromise?: Promise<void>;

  readonly authenticated$ = this.authenticatedSubject.asObservable();
  readonly currentSession$ = this.currentSessionSubject.asObservable();
  readonly currentProfile$ = this.currentProfileSubject.asObservable();

  constructor(private readonly localStorageService: LocalStorageService) {}

  get isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  get currentProfileSnapshot(): UserProfile | null {
    return this.currentProfileSubject.value;
  }

  ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.loadSession();
    }

    return this.initializationPromise;
  }

  async login(
    emailOrCredentials: string | LoginCredentials,
    password?: string,
  ): Promise<boolean> {
    await this.ensureInitialized();

    const credentials =
      typeof emailOrCredentials === 'string'
        ? new LoginCredentialsModel({
            email: emailOrCredentials,
            password: password ?? '',
          })
        : new LoginCredentialsModel(emailOrCredentials);

    try {
      const accounts = await this.loadAccounts();
      const account = accounts.find(
        (a) => a.email === credentials.email && a.passwordHash === credentials.password,
      );

      if (!account) {
        return false;
      }

      const users = await this.loadUsers();
      const profile = users.find((u) => u.id === account.userId);

      if (!profile) {
        return false;
      }

      await this.setSession(account, new UserProfileModel(profile));
      return true;
    } catch {
      return false;
    }
  }

  async register(input?: RegisterAccountInput): Promise<UserProfileModel> {
    await this.ensureInitialized();

    if (!input) {
      throw new Error('Dados de registo em falta.');
    }

    const normalizedInput = new RegisterAccountInputModel(input);

    const accounts = await this.loadAccounts();
    const existing = accounts.find((a) => a.email === normalizedInput.email);
    if (existing) {
      throw new Error('Já existe uma conta com este endereço de e-mail.');
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const account: AuthAccountRecord = {
      userId,
      email: normalizedInput.email,
      passwordHash: normalizedInput.password,
      provider: 'password',
      createdAt: new Date().toISOString(),
    };

    const profile = UserProfileModel.createDefault({
      id: userId,
      displayName: normalizedInput.displayName,
      email: normalizedInput.email,
      interests: normalizedInput.interests,
      bio: normalizedInput.bio,
    });

    await this.saveAccount(account);
    await this.saveProfile(profile);
    await this.setSession(account, profile);

    return profile;
  }

  async updateProfileFields(displayName: string, photoUrl?: string): Promise<void> {
    const currentProfile = this.currentProfileSnapshot;
    const currentSession = this.currentSessionSubject.value;

    if (!currentProfile || !currentSession) {
      throw new Error('Nenhum utilizador autenticado encontrado.');
    }

    const updatedProfile = new UserProfileModel({
      ...currentProfile,
      displayName: displayName,
      avatarUrl: photoUrl || currentProfile.avatarUrl || '',
      avatarInitials: UserProfileModel.buildInitials(displayName),
    });

    await this.saveProfile(updatedProfile);

    const updatedSession = new AuthSessionModel({
      ...currentSession,
      displayName: displayName,
    });

    await this.localStorageService.setItem(LS_SESSION_KEY, updatedSession.toPlainObject());

    this.currentProfileSubject.next(updatedProfile);
    this.currentSessionSubject.next(updatedSession);
  }

  async logout(): Promise<void> {
    await this.localStorageService.setItem(LS_SESSION_KEY, null);
    this.currentSessionSubject.next(null);
    this.currentProfileSubject.next(null);
    this.authenticatedSubject.next(false);
  }

  private async loadSession(): Promise<void> {
    const session = await this.localStorageService.getItem<AuthSession>(LS_SESSION_KEY);

    if (!session) {
      this.currentSessionSubject.next(null);
      this.currentProfileSubject.next(null);
      this.authenticatedSubject.next(false);
      return;
    }

    const users = await this.loadUsers();
    const profile = users.find((u) => u.id === session.userId);

    if (!profile) {
      await this.localStorageService.setItem(LS_SESSION_KEY, null);
      this.authenticatedSubject.next(false);
      return;
    }

    // Migração: corrigir rating hardcoded antigo (default era 5, agora é 0)
    if (profile.stats?.rating === 5 && profile.stats?.completedTrades === 0) {
      profile.stats.rating = 0;
      const updatedUsers = users.map((u) =>
        u.id === profile.id ? { ...u, stats: { ...u.stats, rating: 0 } } : u,
      );
      await this.localStorageService.setItem(LS_USERS_KEY, updatedUsers);
    }

    this.currentSessionSubject.next(new AuthSessionModel(session));
    this.currentProfileSubject.next(new UserProfileModel(profile));
    this.authenticatedSubject.next(true);
  }

  private async setSession(
    account: AuthAccountRecord,
    profile: UserProfileModel,
  ): Promise<void> {
    const session = AuthSessionModel.fromJson({
      userId: account.userId,
      email: account.email,
      displayName: profile.displayName,
      provider: account.provider,
      loggedInAt: new Date().toISOString(),
    });

    await this.localStorageService.setItem(LS_SESSION_KEY, session.toPlainObject());
    this.currentSessionSubject.next(session);
    this.currentProfileSubject.next(profile);
    this.authenticatedSubject.next(true);
  }

  private async loadAccounts(): Promise<AuthAccountRecord[]> {
    const accounts = await this.localStorageService.getItem<AuthAccountRecord[]>(LS_ACCOUNTS_KEY);
    return accounts ?? [];
  }

  private async saveAccount(account: AuthAccountRecord): Promise<void> {
    const accounts = await this.loadAccounts();
    const existing = accounts.findIndex((a) => a.userId === account.userId);
    if (existing >= 0) {
      accounts[existing] = account;
    } else {
      accounts.push(account);
    }
    await this.localStorageService.setItem(LS_ACCOUNTS_KEY, accounts);
  }

  private async loadUsers(): Promise<UserProfile[]> {
    const users = await this.localStorageService.getItem<UserProfile[]>(LS_USERS_KEY);
    return users ?? [];
  }

  private async saveProfile(profile: UserProfileModel): Promise<void> {
    const users = await this.loadUsers();
    const existing = users.findIndex((u) => u.id === profile.id);
    if (existing >= 0) {
      users[existing] = profile.toPlainObject();
    } else {
      users.push(profile.toPlainObject());
    }
    await this.localStorageService.setItem(LS_USERS_KEY, users);
  }
}
