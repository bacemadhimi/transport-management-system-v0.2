import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { IonicModule, IonInput, AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from 'src/app/services/sqlite.service';
import { environment } from 'src/environments/environment';

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
<<<<<<< HEAD
<<<<<<< HEAD
 
  apiUrl = 'http://localhost:5191/api/Auth/login';
 
=======
  
  apiUrl = environment.apiUrl + '/api/Auth/login';
  
>>>>>>> dev
=======
 
  apiUrl = 'http://localhost:5191/api/Auth/login';
 
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  isOnline = true;
  offlineMode = false;
  rememberMe = false; // Add this for the checkbox
  platform: string;

  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private dbService: DatabaseService
  ) {
    this.platform = Capacitor.getPlatform();
    console.log('Running on platform:', this.platform);
  }

  async ngAfterViewInit() {
    await this.checkNetworkStatus();
    await this.loadSavedCredentials();
    
    // Listen for network changes
    Network.addListener('networkStatusChange', (status) => {
      this.isOnline = status.connected;
      console.log('Network status changed:', this.isOnline ? 'online' : 'offline');
      
      if (this.isOnline) {
        this.offlineMode = false;
        this.showToast('Connection restored - Online mode', 2000, 'success');
      } else {
        this.showToast('You are offline - Using local credentials', 3000, 'warning');
      }
    });
  }

  async checkNetworkStatus() {
    try {
      const status = await Network.getStatus();
      this.isOnline = status.connected;
      console.log('Initial network status:', this.isOnline ? 'online' : 'offline');
    } catch (error) {
      console.error('Error checking network status:', error);
      this.isOnline = false;
    }
  }

  async loadSavedCredentials() {
    try {
      if (this.platform === 'android' || this.platform === 'ios') {
        // Native platform - use SQLite
        const lastCreds = await this.dbService.getLastCredentials();
        
        if (lastCreds) {
          if (this.usernameInput) {
            const input = await this.usernameInput.getInputElement();
            input.value = lastCreds.email;
            
            // Optionally auto-fill password if remember me was checked
            // You might want to store a flag for this
            const rememberPref = await Preferences.get({ key: 'rememberMe' });
            if (rememberPref.value === 'true') {
              const passwordInput = await this.passwordInput.getInputElement();
              passwordInput.value = lastCreds.password;
              this.rememberMe = true;
            }
          }
          
          if (!this.isOnline) {
            this.offlineMode = true;
            this.showToast('Offline mode - Using saved credentials', 3000, 'warning');
          }
        }
      } else {
        // Web platform - use Preferences
        const savedEmail = await Preferences.get({ key: 'saved_email' });
        const savedPassword = await Preferences.get({ key: 'saved_password' });
        const rememberPref = await Preferences.get({ key: 'rememberMe' });
        
        if (savedEmail.value && this.usernameInput) {
          const input = await this.usernameInput.getInputElement();
          input.value = savedEmail.value;
          
          if (rememberPref.value === 'true' && savedPassword.value) {
            const passwordInput = await this.passwordInput.getInputElement();
            passwordInput.value = savedPassword.value;
            this.rememberMe = true;
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  }

  async saveCredentials(email: string, password: string) {
    try {
      if (this.platform === 'android' || this.platform === 'ios') {
        // Native platforms - save to SQLite (always save for offline access)
        await this.dbService.saveCredentials(email, password);
        console.log('✅ Credentials saved to SQLite database');
        
        // Save remember me preference
        await Preferences.set({
          key: 'rememberMe',
          value: String(this.rememberMe)
        });
      } else {
        // Web platform - save to Preferences (only if remember me is checked)
        if (this.rememberMe) {
          await Preferences.set({
            key: 'saved_email',
            value: email
          });
          await Preferences.set({
            key: 'saved_password',
            value: password
          });
          await Preferences.set({
            key: 'rememberMe',
            value: 'true'
          });
          console.log('✅ Credentials saved to Preferences (web)');
        } else {
          // Clear saved credentials if remember me is not checked
          await Preferences.remove({ key: 'saved_email' });
          await Preferences.remove({ key: 'saved_password' });
          await Preferences.set({
            key: 'rememberMe',
            value: 'false'
          });
        }
      }
    } catch (error) {
      console.error('❌ Error saving credentials:', error);
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
    const input = this.passwordInput;
    if (input) {
      input.type = this.showPassword ? 'text' : 'password';
    }
  }

  async showToast(message: string, duration = 2000, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'top'
    });
    await toast.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async login() {
    const email = (await this.usernameInput.getInputElement()).value as string;
    const password = (await this.passwordInput.getInputElement()).value as string;

    if (!email || !password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;

    // Check current network status
    try {
      const status = await Network.getStatus();
      this.isOnline = status.connected;
    } catch {
      this.isOnline = false;
    }

    if (!this.isOnline) {
      await this.handleOfflineLogin(email, password);
    } else {
      await this.handleOnlineLogin(email, password);
    }
  }

  private async handleOnlineLogin(email: string, password: string) {
    const body = {
      email: email,
      password: password
    };

    try {
      const res = await firstValueFrom(this.http.post<any>(this.apiUrl, body));
      
      const roles = res.roles || [];

      if (!roles.includes('Driver')) {
        this.isLoading = false;
        await this.showAlert(
          'Access Denied',
          'You do not have permission to access this application.'
        );
        return;
      }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      console.log('📋 Login response:', JSON.stringify(res, null, 2));

      // Create auth token object - include driverId if available
      const authToken: any = {
<<<<<<< HEAD
=======
      // Save credentials based on platform
      await this.saveCredentials(email, password);

      const authToken = {
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
        id: res.id,
        email: res.email,
        token: res.token,
        role: 'Driver',
        permissions: res.permissions || []
      };

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      // If driverId is returned in response, save it
      if (res.driverId) {
        authToken.driverId = res.driverId;
        console.log('✅ driverId from login:', res.driverId);
      } else if (res.DriverId) {
        authToken.driverId = res.DriverId;
        console.log('✅ DriverId from login:', res.DriverId);
      } else {
        // Fallback: use user id as driverId (might work if they're the same)
        authToken.driverId = res.id;
        console.log('⚠️ Using user id as driverId:', res.id);
      }

      // Save token
      this.authService.saveToken(authToken);
      console.log('Token saved, isLoggedIn:', this.authService.isLoggedIn());
      console.log('Saved authToken:', JSON.stringify(authToken, null, 2));

      await this.showToast('Login successful!', 1500);

      // Navigate to home
<<<<<<< HEAD
=======
      this.authService.saveToken(authToken);
      
      await this.showToast('Login successful!', 1500, 'success');
      this.isLoading = false;
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1500);

    } catch (error: any) {
      this.isLoading = false;
      console.log('API login failed, attempting offline fallback...');
    
      let errorMessage = 'Login failed\n\n';

if (error.status === 0) {
    errorMessage += 'Network error: Cannot reach server\n\n';
    errorMessage += `Error message: ${error.message || 'No message'}\n`;
    errorMessage += `URL called: ${this.apiUrl}\n`;
    errorMessage += `App origin: ${window.location.origin}\n`;
    errorMessage += `Platform: ${this.platform}\n`;
    
} else if (error.status === 404) {
    errorMessage += `API endpoint not found (404)\n\n`;
    errorMessage += `URL called: ${this.apiUrl}\n`;
    errorMessage += `App origin: ${window.location.origin}\n`;
    errorMessage += `Message: ${error.message}`;
    
} else if (error.status === 405) {
    errorMessage += `Method not allowed (405)\n\n`;
    errorMessage += `URL called: ${this.apiUrl}\n`;
    errorMessage += `App origin: ${window.location.origin}\n`;
    errorMessage += `Message: ${error.message}`;
    
} else {
    errorMessage += `Status: ${error.status}\n`;
    errorMessage += `Message: ${error.message}\n`;
    errorMessage += `URL called: ${this.apiUrl}\n`;
    errorMessage += `App origin: ${window.location.origin}`;
}

await this.showAlert('Login Error', errorMessage);
      await this.handleOfflineLogin(email, password);
    }
  }

  private async handleOfflineLogin(email: string, password: string) {
    try {
      let isValid = false;

      if (this.platform === 'android' || this.platform === 'ios') {
        // Native - validate against SQLite
        isValid = await this.dbService.validateCredentials(email, password);
      } else {
        // Web - validate against saved Preferences
        const savedPassword = await Preferences.get({ key: 'saved_password' });
        isValid = savedPassword.value === password;
      }
      
      if (isValid) {
        let authToken: any = {
          email: email,
          role: 'Driver',
          permissions: ['offline'],
          offlineMode: true
        };

        if (this.platform === 'android' || this.platform === 'ios') {
          const savedCreds = await this.dbService.getLastCredentials();
          authToken.id = savedCreds?.id || 0;
          authToken.token = 'offline-token';
          await this.dbService.updateLastLogin(email);
        } else {
          authToken.id = 0;
          authToken.token = 'offline-token';
        }

        this.authService.saveToken(authToken);
        
        await this.showToast('Offline login successful!', 2000, 'warning');
        this.isLoading = false;
        setTimeout(() => {
          this.router.navigate(['/home'], { 
            queryParams: { offline: true }
          });
        }, 1500);
      } else {
        this.isLoading = false;
        this.errorMessage = 'Invalid credentials (offline mode)';
      }
    } catch (dbError) {
      this.isLoading = false;
      console.error('Offline login error:', dbError);
      this.errorMessage = 'Offline authentication failed';
    }
  }

  async clearSavedCredentials() {
    try {
      if (this.platform === 'android' || this.platform === 'ios') {
        await this.dbService.clearAll();
      } else {
        await Preferences.remove({ key: 'saved_email' });
        await Preferences.remove({ key: 'saved_password' });
        await Preferences.remove({ key: 'rememberMe' });
      }
      await this.showToast('Saved credentials cleared', 2000, 'success');
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  }

  async getPlatformStorageInfo() {
    if (this.platform === 'android' || this.platform === 'ios') {
      const dbInfo = await this.dbService.getDatabaseInfo();
      const stats = await this.dbService.getStats();
      
      const message = `
        Platform: ${this.platform}
        Storage: SQLite Database
        Records: ${dbInfo.recordCount}
        Last Login: ${stats.lastRecord?.lastLogin || 'None'}
        File: ${dbInfo.filePath}
      `;
      
      await this.showAlert('Storage Info', message);
    } else {
      const email = await Preferences.get({ key: 'saved_email' });
      const rememberMe = await Preferences.get({ key: 'rememberMe' });
      
      const message = `
        Platform: Web
        Storage: Capacitor Preferences
        Email Saved: ${email.value ? 'Yes' : 'No'}
        Remember Me: ${rememberMe.value === 'true' ? 'Yes' : 'No'}
      `;
      
      await this.showAlert('Storage Info', message);
    }
  }

  async quit() {
    const alert = await this.alertCtrl.create({
      header: 'Exit',
      message: 'Are you sure you want to exit the application?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Exit',
          handler: () => {
            this.isLoading = true;
            setTimeout(() => {
              if (this.platform === 'android' || this.platform === 'ios') {
                App.exitApp();
              } else {
                window.close();
              }
            }, 500);
          }
        }
      ]
    });

    await alert.present();
  }
}