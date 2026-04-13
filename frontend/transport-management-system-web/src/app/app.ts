import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
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
import { SignalRService, TripNotification } from './services/signalr.service';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { Translation } from './services/Translation';
import { environment } from '../environments/environment';
import { IGeneralSettings } from './types/general-settings';
import { LogoService } from './services/logo.service';
import { MenuManagerService, MenuType } from './services/menu-manager.service';

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
    MatBadgeModule,
    MatMenuModule,
    CommonModule,
    HttpClientModule,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('transport-management-system-web');
  
  // Références aux éléments du DOM
  @ViewChild('permissionsMenu') permissionsMenu!: ElementRef;
  @ViewChild('notificationsPanel') notificationsPanel!: ElementRef;
  @ViewChild('languageMenu') languageMenu!: ElementRef;
  @ViewChild('themePicker') themePicker!: ElementRef;

  themes!: Theme[];
  allNotifications: TripNotification[] = [];
  currentTheme!: Theme;
  authService = inject(Auth);
  httpService = inject(Http);
  signalRService = inject(SignalRService);
  private http = inject(HttpClient);
  private translation = inject(Translation);
  private menuManager: MenuManagerService = inject(MenuManagerService);
  private logoService = inject(LogoService);

  currentPage = 0;
  pageSize = 20;
  totalNotifications = 0;
  hasMoreNotifications = true;
  currentLanguage = 'fr';
  maintenanceOpen = false;
  userMenuOpen = false;
  companyLogo: string | null = null;
  cancelledTrips: any[] = [];
  cancelledTripsCount = 0;
  notifications: TripNotification[] = [];
  unreadNotificationsCount = 0;
  private readNotificationIds: Set<string> = new Set();
  refreshNotificationInterval: any;
  selectedNotificationTab: 'all' | 'unread' = 'all';
  showOnlineDot = true;

  private notificationsSubscription!: Subscription;
  private cancelledTripsSubscription!: Subscription;
  private connectionStatusSubscription!: Subscription;

  // Getters pour l'état des menus
  get showPermissions(): boolean {
    return this.menuManager.isMenuOpen('permissions');
  }

  get showNotificationsPanel(): boolean {
    return this.menuManager.isMenuOpen('notifications');
  }

  get showLanguageMenu(): boolean {
    return this.menuManager.isMenuOpen('language');
  }

  get showThemePicker(): boolean {
    return this.menuManager.isMenuOpen('theme');
  }

  constructor(private themeService: ThemeService) {
    this.themes = this.themeService.getThemes();
    this.currentTheme = this.themeService.getCurrentTheme();
    this.logoService.logo$.subscribe(logo => {
      this.companyLogo = logo;
    });
  }

  // Écouter les clics sur tout le document
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Vérifier si le clic est dans un des menus ou sur le bouton qui l'ouvre
    const clickedInsidePermission = this.isClickInsideMenu(target, 'permissions');
    const clickedInsideNotification = this.isClickInsideMenu(target, 'notifications');
    const clickedInsideLanguage = this.isClickInsideMenu(target, 'language');
    const clickedInsideTheme = this.isClickInsideMenu(target, 'theme');

    // Si le clic n'est dans aucun menu, tout fermer
    if (!clickedInsidePermission && !clickedInsideNotification && 
        !clickedInsideLanguage && !clickedInsideTheme) {
      this.menuManager.closeAllMenus();
    }
  }

  private isClickInsideMenu(target: HTMLElement, menuType: string): boolean {
    // Vérifier les data-attributs
    if (target.closest(`[data-menu="${menuType}"]`)) {
      return true;
    }

    // Vérifier les éléments du DOM référencés
    switch (menuType) {
      case 'permissions':
        return this.permissionsMenu?.nativeElement?.contains(target) || false;
      case 'notifications':
        return this.notificationsPanel?.nativeElement?.contains(target) || false;
      case 'language':
        return this.languageMenu?.nativeElement?.contains(target) || false;
      case 'theme':
        return this.themePicker?.nativeElement?.contains(target) || false;
      default:
        return false;
    }
  }

  toggleMenu(menuType: MenuType): void {
    this.menuManager.toggleMenu(menuType);
  }

  openNotificationPanel(): void {
    this.toggleMenu('notifications');
  }

  closeAllMenus(): void {
    this.menuManager.closeAllMenus();
  }

  get filteredNotifications() {
    if (this.selectedNotificationTab === 'unread') {
      return this.notifications.filter(n => !n.isRead);
    }
    return this.notifications;
  }

  ngOnInit() {
    this.httpService.getTranslations(this.currentLanguage).subscribe({
      next: data => this.translation.setTranslations(data),
      error: err => console.error('Error loading translations', err)
    });
    this.loadReadNotificationIds();
    if (this.authService.isLoggedIn) {
      this.authService.loadLoggedInUser();
      this.initializeSignalR();
      this.loadCompanyLogo();
      this.loadNotificationsFromDatabase(0, this.pageSize);
    }

    this.loadCancelledTrips();

    this.refreshNotificationInterval = setInterval(() => {
      if (!this.signalRService['connectionStatusSubject'].value) {
        this.loadCancelledTrips();
        this.refreshNotifications();
      }
    }, 30000);
  }

  loadCompanyLogo() {
    this.httpService.getAllSettingsByType('COMPANY').subscribe({
      next: (settings: IGeneralSettings[]) => {
        const companyRecord = settings.find(s => 
          s.parameterCode === 'COMPANY_LOGO'
        );
        
        if (companyRecord?.logoBase64) {
          this.companyLogo = companyRecord.logoBase64;
        } else {
          this.companyLogo = null;
        }
      },
      error: (error) => {
        console.error('Error loading company logo:', error);
        this.companyLogo = null;
      }
    });
  }

  loadNotificationsFromDatabase(pageIndex: number = 0, pageSize: number = 20) {
    this.http.get(`${environment.apiUrl}/api/notifications?pageIndex=${pageIndex}&pageSize=${pageSize}`).subscribe({
      next: (response: any) => {
        if (response.success) {
          const allDbNotifications = (response.data.notifications as any[]).map((n: any) => ({
            ...n,
            isRead: n.isRead === true || n.isRead === 1 || n.isRead === 'true'|| this.readNotificationIds.has(String(n.id)),
            timestamp: new Date(n.timestamp)
          })) as TripNotification[];
          const unreadNotifications = allDbNotifications.filter((n: TripNotification) => !n.isRead); 
          this.allNotifications = allDbNotifications;

          if (pageIndex === 0) {
            this.notifications = unreadNotifications;
          } else {
            const existingIds = new Set(this.notifications.map((n: TripNotification) => n.id));
            const uniqueNewNotifications = unreadNotifications.filter((n: TripNotification) => !existingIds.has(n.id));
            this.notifications = [...this.notifications, ...uniqueNewNotifications];
          }

          this.unreadNotificationsCount = this.notifications.filter((n: TripNotification) => !n.isRead).length;
          this.totalNotifications = response.data.totalCount;
          this.hasMoreNotifications = this.notifications.length < this.totalNotifications;

          console.log('📚 DB Load - All notifications:', this.notifications.length);
          console.log('📚 Unread count:', this.unreadNotificationsCount);
        } else {
          console.warn('⚠️ Invalid notification response:', response);
          this.notifications = [];
          this.allNotifications = [];
          this.unreadNotificationsCount = 0;
        }
      },
      error: (err) => {
        console.error('❌ Error loading notifications from database:', err);
        this.notifications = [];
        this.allNotifications = [];
        this.unreadNotificationsCount = 0;
      }
    });
  }

  loadMoreNotifications() {
    this.currentPage++;
    this.loadNotificationsFromDatabase(this.currentPage, this.pageSize);
  }

  refreshNotifications() {
    this.currentPage = 0;
    this.loadNotificationsFromDatabase(0, this.pageSize);
  }

  initializeSignalR() {
    this.notificationsSubscription = this.signalRService.notifications$.subscribe(
      (realtimeNotifications: TripNotification[]) => {
        console.log('📬 Raw real-time notifications:', realtimeNotifications);

        const processedNotifications = realtimeNotifications.map(n => ({
          ...n,
          isRead: n.isRead === true || this.readNotificationIds.has(String(n.id)),
          timestamp: new Date(n.timestamp)
        }));
        const unreadRealtimeNotifications = processedNotifications.filter((n: TripNotification) => !n.isRead);
        this.allNotifications = [...this.allNotifications, ...processedNotifications];

        const existingIds = new Set(this.notifications.map((n: TripNotification) => n.id));
        const uniqueNewNotifications = unreadRealtimeNotifications.filter((n: TripNotification) => !existingIds.has(n.id));

        if (uniqueNewNotifications.length > 0) {
          this.notifications = [...uniqueNewNotifications, ...this.notifications];
          console.log('✅ Added new real-time notifications:', uniqueNewNotifications.length);
        }

        this.unreadNotificationsCount = this.notifications.filter((n: TripNotification) => !n.isRead).length;

        console.log('📋 Current notifications:', this.notifications.length);
        console.log('📋 Unread count:', this.unreadNotificationsCount);
      }
    );
  }

  loadCancelledTrips() {
    if (!this.authService.isLoggedIn) {
      this.cancelledTripsCount = 0;
      this.cancelledTrips = [];
      return;
    }

    this.httpService.getTripsList({ pageIndex: 0, pageSize: 1000 }).subscribe({
      next: (res: any) => {
        const tripsData = res?.data?.data || res?.data || res || [];
        this.cancelledTrips = Array.isArray(tripsData) 
          ? tripsData.filter((t: any) => t.tripStatus === 'Cancelled') 
          : [];
        this.cancelledTripsCount = this.cancelledTrips.length;
      },
      error: (err) => {
        console.error('Erreur loading cancelled trips:', err);
        this.cancelledTrips = [];
        this.cancelledTripsCount = 0;
      }
    });
  }

  openNotification() {
    if (this.cancelledTripsCount === 0) {
      alert('Aucun voyage annulé');
      return;
    }
    this.menuManager.openMenu('notifications');
  }

  viewTripDetails(tripId?: number) {
    if (tripId) {
      // Navigation vers les détails du voyage
      this.menuManager.closeAllMenus();
    }
  }

  async markAllNotificationsAsRead() {
    await this.signalRService.markAllAsRead();
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.unreadNotificationsCount = 0;
    console.log('✅ All cancelled notifications marked as read');
  }

  clearAllNotifications() {
    this.notifications = [];
    this.allNotifications = [];
    this.unreadNotificationsCount = 0;
    this.signalRService.clearNotifications();
  }

  async markNotificationAsRead(notification: TripNotification) {
    if (!notification.isRead) {
      await this.signalRService.markAsRead(notification.id);
      notification.isRead = true;
       // Ajouter au set local et sauvegarder
      this.readNotificationIds.add(String(notification.id));
      this.saveReadNotificationIds();

      // Retirer de la liste des notifications non lues
      this.notifications = this.notifications.filter(n => n.id !== notification.id);
      this.unreadNotificationsCount = this.notifications.filter((n: TripNotification) => !n.isRead).length;
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'sync';
      case 'TRIP_CANCELLED':
        return 'cancel';
      case 'NEW_TRIP':
        return 'add_circle';
      default:
        return 'notifications';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'text-blue-500';
      case 'TRIP_CANCELLED':
        return 'text-red-500';
      case 'NEW_TRIP':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return new Date(timestamp).toLocaleDateString();
  }

  viewAllNotifications() {
    console.log('View all notifications');
    this.menuManager.closeAllMenus();
    // Navigation vers la page de toutes les notifications
  }

  onFooterButtonMouseEnter(event: MouseEvent) {
    const element = event.target as HTMLElement;
    element.style.color = 'var(--primary-dark)';
  }

  onFooterButtonMouseLeave(event: MouseEvent) {
    const element = event.target as HTMLElement;
    element.style.color = 'var(--primary-color)';
  }

  ngOnDestroy() {
    if (this.refreshNotificationInterval) {
      clearInterval(this.refreshNotificationInterval);
    }

    this.notificationsSubscription?.unsubscribe();
    this.cancelledTripsSubscription?.unsubscribe();
    this.connectionStatusSubscription?.unsubscribe();

    this.signalRService.disconnect();
  }

  toggleMaintenance() { 
    this.maintenanceOpen = !this.maintenanceOpen; 
  }
  
  toggleUserMenu() { 
    this.userMenuOpen = !this.userMenuOpen; 
  }

  logout() {
    this.signalRService.disconnect();
    this.authService.logout();
    this.menuManager.closeAllMenus();
  }

  changeLanguage(lang: string) {
    this.currentLanguage = lang;
    this.httpService.getTranslations(lang).subscribe({
      next: data => this.translation.setTranslations(data),
      error: err => console.error('Error loading translations', err)
    });
    this.menuManager.closeAllMenus();
  }

  t(key: string): string { 
    return this.translation.t(key); 
  }

  changeTheme(theme: Theme) {
    this.themeService.setTheme(theme);
    this.currentTheme = theme;
    this.menuManager.closeAllMenus();
  }

  resetToDefaultTheme() {
    this.changeTheme(this.themes[0]);
  }

   private loadReadNotificationIds() {
    try {
      const stored = localStorage.getItem('readNotificationIds');
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        this.readNotificationIds = new Set(ids);
        console.log('📖 Loaded read notification IDs:', this.readNotificationIds.size);
      }
    } catch (e) {
      console.error('Error loading read notification IDs:', e);
    }
  }

  private saveReadNotificationIds() {
    try {
      localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(this.readNotificationIds)));
    } catch (e) {
      console.error('Error saving read notification IDs:', e);
    }
  }
}