import { Translation } from './services/Translation';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Auth } from './services/auth';
import { Http } from './services/http';
import { Theme, ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatExpansionModule,
    CommonModule,
    HttpClientModule,
    RouterOutlet
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('transport-management-system-web');
  showThemePicker = false;
  themes!: Theme[];
  currentTheme!: Theme;
  authService = inject(Auth);
  httpService = inject(Http);
  private http = inject(HttpClient);
  private translation = inject(Translation);

  showPermissions = false;
  showLanguageMenu: boolean = false;
  currentLanguage = 'fr';
  maintenanceOpen = false;
  userMenuOpen = false;

  cancelledTrips: any[] = [];
  cancelledTripsCount = 0;
  refreshNotificationInterval: any;

  constructor(
    private themeService: ThemeService
  ) {
    this.themes = this.themeService.getThemes();
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  ngOnInit() {
    this.httpService.getTranslations(this.currentLanguage).subscribe({
      next: data => this.translation.setTranslations(data),
      error: err => console.error('Error loading translations', err)
    });

    if (this.authService.isLoggedIn) this.authService.loadLoggedInUser();
    this.loadCancelledTrips();
    this.refreshNotificationInterval = setInterval(() => this.loadCancelledTrips(), 5000);
  }

  loadCancelledTrips() {
    if (!this.authService.isLoggedIn) {
      this.cancelledTripsCount = 0;
      this.cancelledTrips = [];
      return;
    }
    this.httpService.getTripsList({ pageIndex: 0, pageSize: 1000 }).subscribe({
      next: (res: any) => {
        this.cancelledTrips = res?.data?.filter((t: any) => t.tripStatus === 'Cancelled') ?? [];
        this.cancelledTripsCount = this.cancelledTrips.length;
      },
      error: (err) => console.error('Erreur notification:', err)
    });
  }

  openNotification() {
    if (this.cancelledTripsCount === 0) {
      alert('Aucun voyage annulé');
      return;
    }
    const message = this.cancelledTrips
      .map(t =>
        `🚚 Trip ID: ${t.id}\n👤 Driver: ${t.driver ?? 'N/A'}\n📝 Message: ${t.message ?? 'Aucun message'}`
      ).join('\n\n');
    alert(`Il y a ${this.cancelledTripsCount} voyage(s) annulé(s):\n\n${message}`);
  }

  ngOnDestroy() {
    if (this.refreshNotificationInterval) clearInterval(this.refreshNotificationInterval);
  }

  toggleMaintenance() { this.maintenanceOpen = !this.maintenanceOpen; }
  toggleUserMenu() { this.userMenuOpen = !this.userMenuOpen; }
  logout() { this.authService.logout(); }

  changeLanguage(lang: string) {
    this.currentLanguage = lang;
    this.httpService.getTranslations(lang).subscribe({
      next: data => this.translation.setTranslations(data),
      error: err => console.error('Error loading translations', err)
    });
  }

  t(key: string): string { return this.translation.t(key); }

  changeTheme(theme: Theme) {
    this.themeService.setTheme(theme);
    this.currentTheme = theme;
    this.showThemePicker = false;
  }

  resetToDefaultTheme() {
    this.changeTheme(this.themes[0]);
  }
  
}