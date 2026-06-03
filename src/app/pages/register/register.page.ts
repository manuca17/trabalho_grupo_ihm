import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { RegisterAccountInputModel } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';

type RegisterStep = 1 | 2;

const COLLECTION_INTERESTS = [
  'Romanas',
  'Gregas',
  'Medievais',
  'Islamicas',
  'Ibericas',
  'Egipcias',
  'Celtas',
  'Bizantinas',
];

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  readonly collectionInterests = COLLECTION_INTERESTS;

  step: RegisterStep = 1;
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  interests: string[] = [];
  error = '';
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  toggleInterest(interest: string): void {
    this.interests = this.interests.includes(interest)
      ? this.interests.filter((item) => item !== interest)
      : [...this.interests, interest];
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async goBack(): Promise<void> {
    if (this.step === 2) {
      this.error = '';
      this.step = 1;
      return;
    }

    await this.router.navigate(['/login']);
  }

  continueToStepTwo(): void {
    this.error = '';

    if (!this.name.trim()) {
      this.error = 'Insere o teu nome.';
      return;
    }

    if (!this.email.trim()) {
      this.error = 'Insere o teu email.';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'As palavras-passe nao coincidem.';
      return;
    }

    this.step = 2;
  }

  async handleRegister(): Promise<void> {
    this.error = '';

    if (!this.interests.length) {
      this.error =
        'Seleciona pelo menos um interesse para personalizar o perfil.';
      return;
    }

    this.loading = true;
    try {
      await this.authService.register(
        new RegisterAccountInputModel({
          displayName: this.name,
          email: this.email,
          password: this.password,
          interests: this.interests,
          bio: `Colecionador interessado em ${this.interests.join(', ')}.`,
        }).toPlainObject(),
      );
      this.loading = false;

      await this.router.navigate(['/tabs/tab5'], {
        queryParams: { nav: 'home' },
        replaceUrl: true,
      });
    } catch (error) {
      this.loading = false;
      this.error =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel criar conta.';
    }
  }

  async goToLogin(): Promise<void> {
    await this.router.navigate(['/login']);
  }
}
