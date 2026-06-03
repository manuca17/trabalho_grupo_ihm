import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { LoginCredentialsModel } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  email = '';
  password = '';
  showPassword = false;
  error = '';
  helperMessage = '';
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async handleLogin(): Promise<void> {
    this.error = '';
    this.helperMessage = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Por favor preenche todos os campos.';
      return;
    }

    this.loading = true;
    const authenticated = await this.authService.login(
      new LoginCredentialsModel({
        email: this.email,
        password: this.password,
      }).toPlainObject(),
    );
    this.loading = false;

    if (authenticated) {
      await this.router.navigate(['/tabs/tab5'], {
        queryParams: { nav: 'home' },
        replaceUrl: true,
      });
      return;
    }

    this.error = 'Email ou palavra-passe incorretos.';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  showForgotPasswordHint(): void {
    this.error = '';
    this.helperMessage =
      'Recuperação de palavra-passe ainda nao esta disponivel nesta versao.';
  }

  async goToRegister(): Promise<void> {
    this.error = '';
    this.helperMessage = '';
    await this.router.navigate(['/register']);
  }
}
