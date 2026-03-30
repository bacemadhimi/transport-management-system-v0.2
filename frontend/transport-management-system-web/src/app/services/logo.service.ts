import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Http } from './http';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private logoSubject = new BehaviorSubject<string | null>(null);
  logo$ = this.logoSubject.asObservable();

  constructor(private http: Http) {
    this.loadLogo();
  }

  loadLogo() {
    this.http.getAllSettingsByType('COMPANY').subscribe({
      next: (settings) => {
        const logo = settings.find(s => s.parameterCode === 'COMPANY_LOGO');
        this.logoSubject.next(logo?.logoBase64 || null);
      }
    });
  }

  refresh() {
    this.loadLogo();
  }
}