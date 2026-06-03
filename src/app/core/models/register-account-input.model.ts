export interface RegisterAccountInput {
  displayName: string;
  email: string;
  password: string;
  interests: string[];
  bio?: string;
}

export class RegisterAccountInputModel implements RegisterAccountInput {
  displayName: string;
  email: string;
  password: string;
  interests: string[];
  bio?: string;

  constructor(data: RegisterAccountInput) {
    this.displayName = data.displayName.trim();
    this.email = data.email.trim().toLowerCase();
    this.password = data.password;
    this.interests = [...(data.interests ?? [])];
    this.bio = data.bio?.trim();
  }

  toPlainObject(): RegisterAccountInput {
    return {
      displayName: this.displayName,
      email: this.email,
      password: this.password,
      interests: [...this.interests],
      bio: this.bio,
    };
  }
}
