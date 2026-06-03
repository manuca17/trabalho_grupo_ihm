import { Injectable } from '@angular/core';
import {
  Auth,
  User,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import {
  FirestoreUserProfileDto,
  mapUserProfileFromFirestore,
  mapUserProfileToFirestore,
} from '../mappers/firestore/auth.firestore.mapper';
import {
  AuthSession,
  AuthSessionModel,
  LoginCredentials,
  LoginCredentialsModel,
  RegisterAccountInput,
  RegisterAccountInputModel,
  UserProfile,
  UserProfileModel,
} from '../models/auth.model';

const USERS_COLLECTION = 'users';

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

  constructor(
    private readonly firebaseAuth: Auth,
    private readonly firestore: Firestore,
  ) {}

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
      const credential = await signInWithEmailAndPassword(
        this.firebaseAuth,
        credentials.email,
        credentials.password,
      );
      const profile = await this.ensureProfileForUser(credential.user);
      await this.setSession(credential.user, profile);
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
    const credential = await createUserWithEmailAndPassword(
      this.firebaseAuth,
      normalizedInput.email,
      normalizedInput.password,
    );

    await updateProfile(credential.user, {
      displayName: normalizedInput.displayName,
    });

    const profile = UserProfileModel.createDefault({
      id: credential.user.uid,
      displayName: normalizedInput.displayName,
      email: normalizedInput.email,
      interests: normalizedInput.interests,
      bio: normalizedInput.bio,
    });

    await this.saveProfile(profile);
    await this.setSession(credential.user, profile);

    return profile;
  }

  async logout(): Promise<void> {
    await signOut(this.firebaseAuth);
    this.currentSessionSubject.next(null);
    this.currentProfileSubject.next(null);
    await this.setAuthenticated(false);
  }

  private async loadSession(): Promise<void> {
    const firebaseUser = await firstValueFrom(authState(this.firebaseAuth));

    if (!firebaseUser) {
      this.currentSessionSubject.next(null);
      this.currentProfileSubject.next(null);
      this.authenticatedSubject.next(false);
      return;
    }

    const profile = await this.ensureProfileForUser(firebaseUser);
    await this.setSession(firebaseUser, profile);
  }

  private async setAuthenticated(isAuthenticated: boolean): Promise<void> {
    this.authenticatedSubject.next(isAuthenticated);
  }

  private async setSession(
    firebaseUser: User,
    profile: UserProfileModel,
  ): Promise<void> {
    const session = AuthSessionModel.fromJson({
      userId: firebaseUser.uid,
      email: firebaseUser.email ?? profile.email,
      displayName: profile.displayName,
      provider: this.resolveProvider(firebaseUser),
      loggedInAt: new Date().toISOString(),
    });
    this.currentSessionSubject.next(session);
    this.currentProfileSubject.next(profile);
    await this.setAuthenticated(true);
  }

  private async ensureProfileForUser(
    firebaseUser: User,
  ): Promise<UserProfileModel> {
    const profileRef = doc(this.firestore, USERS_COLLECTION, firebaseUser.uid);
    const profileSnapshot = await getDoc(profileRef);

    if (profileSnapshot.exists()) {
      return mapUserProfileFromFirestore(
        profileSnapshot.id,
        profileSnapshot.data() as FirestoreUserProfileDto,
      );
    }

    const profile = UserProfileModel.createDefault({
      id: firebaseUser.uid,
      displayName:
        firebaseUser.displayName?.trim() ||
        this.buildDisplayNameFromEmail(firebaseUser.email),
      email: firebaseUser.email ?? '',
      interests: [],
      bio: 'Colecionador registado na Ancient Coins Exchange.',
    });

    await this.saveProfile(profile);
    return profile;
  }

  private async saveProfile(profile: UserProfileModel): Promise<void> {
    const profileRef = doc(this.firestore, USERS_COLLECTION, profile.id);
    await setDoc(profileRef, mapUserProfileToFirestore(profile));
  }

  private resolveProvider(firebaseUser: User): 'password' | 'demo' {
    return firebaseUser.providerData.some(
      (provider) => provider.providerId === 'password',
    )
      ? 'password'
      : 'demo';
  }

  private buildDisplayNameFromEmail(email: string | null): string {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return 'Colecionador';
    }

    return normalizedEmail.split('@')[0] || 'Colecionador';
  }
}
