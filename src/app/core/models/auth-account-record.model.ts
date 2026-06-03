export interface AuthAccountRecord {
  userId: string;
  email: string;
  passwordHash: string;
  provider: 'password' | 'demo';
  createdAt: string;
  lastLoginAt?: string;
}

export class AuthAccountRecordModel implements AuthAccountRecord {
  userId: string;
  email: string;
  passwordHash: string;
  provider: 'password' | 'demo';
  createdAt: string;
  lastLoginAt?: string;

  constructor(data: AuthAccountRecord) {
    this.userId = data.userId;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.provider = data.provider;
    this.createdAt = data.createdAt;
    this.lastLoginAt = data.lastLoginAt;
  }

  static fromJson(data: AuthAccountRecord): AuthAccountRecordModel {
    return new AuthAccountRecordModel(data);
  }

  static fromJsonArray(
    data: AuthAccountRecord[] | null | undefined,
  ): AuthAccountRecordModel[] {
    return (data ?? []).map((item) => new AuthAccountRecordModel(item));
  }

  toPlainObject(): AuthAccountRecord {
    return {
      userId: this.userId,
      email: this.email,
      passwordHash: this.passwordHash,
      provider: this.provider,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt,
    };
  }
}
