import { Component, inject, OnInit } from '@angular/core';
import { Auth } from '../../services/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {
  authService = inject(Auth);
  fb = inject(FormBuilder);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  loginForm!: FormGroup;
  isLoading = false;
  loginError: string | null = null;


  showPassword = false;
  emailFocused = false;
  passwordFocused = false;

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });

    if (this.authService.isLoggedIn) {
      this.redirectByRole();
    }
  }

  get showEmailError(): boolean {
    const emailControl = this.loginForm?.get('email');
    return !!emailControl && emailControl.invalid && (emailControl.dirty || emailControl.touched);
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.loginError = null;

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: (result) => {
        this.authService.saveToken(result);
        this.isLoading = false;
        this.redirectByRole(result.roles);
      },
      error: (error) => {
        this.isLoading = false;
        this.loginError = "Email ou mot de passe incorrect";
        console.error('Login error:', error);
      }
    });
  }

  onForgotPassword() {
    const email = this.loginForm.value.email;

    if (!email) {
      this.snackBar.open(
        "Veuillez entrer votre email pour réinitialiser le mot de passe",
        "Fermer",
        { duration: 4000 }
      );
      return;
    }

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.snackBar.open(
          "Un email de réinitialisation a été envoyé",
          "Fermer",
          { duration: 4000, panelClass: ['success-snackbar'] }
        );
      },
      error: () => {
        this.snackBar.open(
          "Cet email n'existe pas",
          "Fermer",
          { duration: 4000 }
        );
      }
    });
  }

  private redirectByRole(roles?: string[]) {
    const userRoles = roles ?? this.authService.authDetail?.roles ?? [];

    if (userRoles.includes('SuperAdmin')) {
      this.router.navigateByUrl('/home');
    } else if (userRoles.includes('Admin')) {
      this.router.navigateByUrl('/admin-dashboard');
    } else {
      this.router.navigateByUrl('/user-dashboard');
    }
  }

onGoogleLogin() {
  this.isLoading = true;


  this.authService.loginWithGoogle().subscribe({
    next: (result) => {
      this.authService.saveToken(result);
      this.isLoading = false;
      this.redirectByRole(result.roles);

      this.snackBar.open(
        'Connexion avec Google réussie',
        'Fermer',
        { duration: 3000, panelClass: ['success-snackbar'] }
      );
    },
    error: (error) => {
      this.isLoading = false;
      this.loginError = 'Erreur de connexion avec Google';
      console.error('Erreur Google login:', error);

      this.snackBar.open(
        'Échec de la connexion avec Google',
        'Fermer',
        { duration: 4000 }
      );
    }
  });
}
}