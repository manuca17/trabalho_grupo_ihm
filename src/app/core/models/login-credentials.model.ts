export interface LoginCredentials {
  email: string;
  password: string;
}

export class LoginCredentialsModel implements LoginCredentials {
  email: string;
  password: string;

  constructor(data: LoginCredentials) {
    this.email = data.email.trim().toLowerCase();
    this.password = data.password;
  }

  toPlainObject(): LoginCredentials {
    return {
      email: this.email,
      password: this.password,
    };
  }
}
