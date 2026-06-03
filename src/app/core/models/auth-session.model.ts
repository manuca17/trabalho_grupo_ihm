export interface AuthSession {
  userId: string;
  email: string;
  displayName: string;
  provider: 'password' | 'demo';
  loggedInAt: string;
}

export class AuthSessionModel implements AuthSession {
  userId: string;
  email: string;
  displayName: string;
  provider: 'password' | 'demo';
  loggedInAt: string;

  constructor(data: AuthSession) {
    this.userId = data.userId;
    this.email = data.email;
    this.displayName = data.displayName;
    this.provider = data.provider;
    this.loggedInAt = data.loggedInAt;
  }

  static fromJson(data: AuthSession): AuthSessionModel {
    return new AuthSessionModel(data);
  }

  toPlainObject(): AuthSession {
    return {
      userId: this.userId,
      email: this.email,
      displayName: this.displayName,
      provider: this.provider,
      loggedInAt: this.loggedInAt,
    };
  }
}
