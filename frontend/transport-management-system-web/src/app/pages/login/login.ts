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
import { SignalRService } from '../../services/signalr.service'; // Add this import
import { RefreshService } from '../../services/refresh.service';

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
  signalRService = inject(SignalRService); 
  private refreshService = inject(RefreshService);

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
      // ✅ Save token FIRST
      this.authService.saveToken(result);
      
      // ✅ Force token to be written to localStorage immediately
      localStorage.setItem('token', result.token);
      
      this.isLoading = false;
      
      // Initialize SignalR
      this.signalRService.initializeAfterLogin();
      
      // Navigate first
      this.redirectByRole(result.roles);
      
      // ✅ Longer delay to ensure everything is settled
      setTimeout(() => {
        console.log('🔑 Token in localStorage:', localStorage.getItem('token') ? 'PRESENT' : 'MISSING');
        this.refreshService.triggerRefresh();
      }, 1000);
    },
    error: (error) => {
      this.isLoading = false;
      this.loginError = "Email ou mot de passe incorrect";
      console.error('Login error:', error);
    }
  });
}

onGoogleLogin() {
  this.isLoading = true;
  this.loginError = null;

  this.authService.loginWithGoogle().subscribe({
    next: (result) => {
      // ✅ Save token FIRST
      this.authService.saveToken(result);
      
      // ✅ Force token to be written to localStorage immediately
      localStorage.setItem('token', result.token);
      
      this.isLoading = false;
      
      // Initialize SignalR
      this.signalRService.initializeAfterLogin();
      
      // Navigate first
      this.redirectByRole(result.roles);
      
      // ✅ Longer delay
      setTimeout(() => {
        console.log('🔑 Token in localStorage:', localStorage.getItem('token') ? 'PRESENT' : 'MISSING');
        this.refreshService.triggerRefresh();
      }, 1000);
      
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

}