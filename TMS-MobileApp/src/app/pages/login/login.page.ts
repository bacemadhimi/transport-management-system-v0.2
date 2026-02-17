import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { IonicModule, IonInput, AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpParams, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    HttpClientModule,
    RouterModule,
    CommonModule,
    FormsModule
  ]
})
export class LoginPage implements AfterViewInit {
 
  @ViewChild('usernameInput') usernameInput!: IonInput;
  @ViewChild('passwordInput') passwordInput!: IonInput;
 
  //apiUrl = 'http://localhost:5191/api/User';
  apiUrl = 'https://localhost:7287/api/Auth/login';
 
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}
 
  ngAfterViewInit() {
    // Clear inputs on page load
    this.usernameInput.value = '';
    this.passwordInput.value = '';
  }

  // Toggle password visibility
  togglePassword() {
    this.showPassword = !this.showPassword;
    const input = this.passwordInput;
    if (input) {
      input.type = this.showPassword ? 'text' : 'password';
    }
  }

  // Reusable toast method
  async showToast(message: string, duration = 2000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color: 'success',
      position: 'middle'
    });
    await toast.present();
  }

  // Reusable alert method
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
 
 
//    async login() {
//   const email = (await this.usernameInput.getInputElement()).value as string;
//   const password = (await this.passwordInput.getInputElement()).value as string;
 
//   if (!email || !password) {
//     this.errorMessage = 'Please enter both email and password';
//     return;
//   }
 
//   // Clear previous error
//   this.errorMessage = '';
//   this.isLoading = true;
 

//   // Clear previous error
//   this.errorMessage = '';
//   this.isLoading = true;

//   const body = {
//     email: email,
//     password: password
//   };


//   this.http.post<any>(this.apiUrl, body).subscribe(
//     async (res) => {
//       // Create auth token object
//       const authToken = {
//         id: res.id,
//         email: res.email,
//         token: res.token,
//         role: res.roles?.[0] || 'user', // Assuming roles is an array
//         permissions: res.permissions || []
//       };
 
//       // Use auth service to save token
//       this.authService.saveToken(authToken);
//       console.log('Token saved, isLoggedIn:', this.authService.isLoggedIn());
 
//       await this.showToast('Login successful!', 1500);
 

//       // Use auth service to save token
//       this.authService.saveToken(authToken);
//       console.log('Token saved, isLoggedIn:', this.authService.isLoggedIn());

//       await this.showToast('Login successful!', 1500);

//       setTimeout(() => {
//         console.log('Navigating to home...');
//         this.router.navigate(['/home']);
//       }, 1500);
//     },
//     async (err) => {
//       this.isLoading = false;
//       const msg = err?.error?.message || 'Invalid email or password';
//       this.errorMessage = msg;
//       console.error('Login error:', err);
//     }
//   );
// }

   async login() {
  const email = (await this.usernameInput.getInputElement()).value as string;
  const password = (await this.passwordInput.getInputElement()).value as string;

  if (!email || !password) {
    this.errorMessage = 'Please enter both email and password';
    return;
  }

  // Clear previous error and start loading
  this.errorMessage = '';
  this.isLoading = true;

  const body = {
    email: email,
    password: password
  };

  this.http.post<any>(this.apiUrl, body).subscribe(
    async (res) => {
      const roles = res.roles || [];

      // 🚨 Only allow Driver role
      if (!roles.includes('Driver')) {
        this.isLoading = false;
        await this.showAlert(
          'Accès refusé',
          'Vous n\'avez pas le droit d\'accéder à cette application.'
        );
        return;
      }

      // Create auth token object
      const authToken = {
        id: res.id,
        email: res.email,
        token: res.token,
        role: 'Driver',
        permissions: res.permissions || []
      };

      // Save token
      this.authService.saveToken(authToken);
      console.log('Token saved, isLoggedIn:', this.authService.isLoggedIn());

      await this.showToast('Login successful!', 1500);

      // Navigate to home
      setTimeout(() => {
        console.log('Navigating to home...');
        this.router.navigate(['/home']);
      }, 1500);
    },
    async (err) => {
      this.isLoading = false;
      const msg = err?.error?.message || 'Invalid email or password';
      this.errorMessage = msg;
      console.error('Login error:', err);
    }
  );
}



  async quit() {
    const alert = await this.alertCtrl.create({
      header: 'Quitter ?',
      message: 'Vous voulez vraiment quitter ?',
      buttons: [
        { text: 'Non', role: 'cancel' },
        { text: 'Oui', handler: () => window.close() }
      ]
    });
    await alert.present();
  }
}