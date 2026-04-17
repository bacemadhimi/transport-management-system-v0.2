// src/app/services/google-auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

declare const google: any;

export interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  idToken?: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private http = inject(HttpClient);
  private readonly GOOGLE_CLIENT_ID = '1037333558864-ms07mmct4g05acvbouppvs44qnh3ebrn.apps.googleusercontent.com'; 
  private tokenClient: any;

  constructor() {
    this.loadGoogleScript();
  }

  private loadGoogleScript(): void {
    // Vérifier si le script est déjà chargé
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      this.initializeGoogleClient();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeGoogleClient();
    script.onerror = (error) => console.error('Failed to load Google Identity Services:', error);
    document.head.appendChild(script);
  }

  private initializeGoogleClient(): void {
    if (typeof google === 'undefined' || !google.accounts) {
      console.error('Google Identity Services not loaded');
      return;
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (response: any) => {
        if (response.error) {
          console.error('Google auth error:', response);
          window.dispatchEvent(new CustomEvent('google-auth-error', { 
            detail: response.error 
          }));
          return;
        }
        this.handleCredentialResponse(response);
      },
    });
  }

  private handleCredentialResponse(response: any): void {
    const accessToken = response.access_token;
    
    // Récupérer les informations utilisateur depuis Google
    this.http.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).subscribe({
      next: (userInfo: any) => {
        const googleData: GoogleUserData = {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: accessToken,
          idToken: response.id_token || accessToken // Utiliser id_token si disponible
        };
        
        // Émettre un événement de succès
        window.dispatchEvent(new CustomEvent('google-auth-success', { 
          detail: googleData 
        }));
      },
      error: (error) => {
        console.error('Failed to fetch user info:', error);
        window.dispatchEvent(new CustomEvent('google-auth-error', { 
          detail: error 
        }));
      }
    });
  }

  login(): void {
    if (!this.tokenClient) {
      console.error('Google client not initialized');
      return;
    }
    
    this.tokenClient.requestAccessToken({
      prompt: 'select_account'
    });
  }
}