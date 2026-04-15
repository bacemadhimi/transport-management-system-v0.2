import { BehaviorSubject } from "rxjs";
import { Http } from "./http";
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  private logoSubject = new BehaviorSubject<string | null>(null);
  logo$ = this.logoSubject.asObservable();

  constructor(private http: Http) {}

  loadLogo() {
    this.http.getAllSettingsByType('COMPANY').subscribe({
      next: (settings) => {
        const logo = settings.find(s => s.parameterCode === 'COMPANY_LOGO');
        this.logoSubject.next(logo?.logoBase64 || null);
      },
      error: () => this.logoSubject.next(null)
    });
  }

  refresh() {
    this.loadLogo();
  }
}