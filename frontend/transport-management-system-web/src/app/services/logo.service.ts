// logo.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Http } from './http';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private logoSubject = new BehaviorSubject<string | null>(null);
  logo$ = this.logoSubject.asObservable();

  constructor(private http: Http, private authService: Auth) {
    this.loadLogo();
  }

  loadLogo() {
    
    if (!this.authService.isLoggedIn || !this.authService.isTokenValid?.()) {
      console.log('⏭️ Skip logo loading - not authenticated');
      return;
    }
    
    this.http.getAllSettingsByType('COMPANY').subscribe({
      next: (settings) => {
        const logo = settings.find(s => s.parameterCode === 'COMPANY_LOGO');
        this.logoSubject.next(logo?.logoBase64 || null);
      },
      error: (err) => {
        console.error('Error loading logo:', err);
        this.logoSubject.next(null);
      }
    });
  }

  refresh() {
    this.loadLogo();
  }
}