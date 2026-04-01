
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
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
  showThemePicker = false;
  themes!: Theme[];
  allNotifications: TripNotification[] = [];
  currentTheme!: Theme;
  authService = inject(Auth);
  httpService = inject(Http);
  signalRService = inject(SignalRService);
  private http = inject(HttpClient);
  private translation = inject(Translation);
  currentPage = 0;
  pageSize = 20;
  totalNotifications = 0;
  hasMoreNotifications = true;
  showPermissions = false;
  showLanguageMenu: boolean = false;
  currentLanguage = 'fr';
  maintenanceOpen = false;
  userMenuOpen = false;
  companyLogo: string | null = null;
  cancelledTrips: any[] = [];
  cancelledTripsCount = 0;
  notifications: TripNotification[] = [];
  unreadNotificationsCount = 0;
  showNotificationsPanel = false;
  refreshNotificationInterval: any;


  selectedNotificationTab: 'all' | 'unread' = 'all';

  private logoService = inject(LogoService);
  showOnlineDot = true;

  private notificationsSubscription!: Subscription;
  private cancelledTripsSubscription!: Subscription;
  private connectionStatusSubscription!: Subscription;

  constructor(
    private themeService: ThemeService
  ) {
    this.themes = this.themeService.getThemes();
    this.currentTheme = this.themeService.getCurrentTheme();
    this.logoService.logo$.subscribe(logo => {
      this.companyLogo = logo;
    });
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
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Create headers with authorization
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });
  
  this.http.get(`${environment.apiUrl}/api/notifications?pageIndex=${pageIndex}&pageSize=${pageSize}`, { headers }).subscribe({
    next: (response: any) => {
      if (response?.success && response?.data) {
        // Get ALL notifications from database and map them
        const allDbNotifications = (response.data.notifications || []).map((n: any) => ({
          ...n,

          isRead: n.isRead === true || n.isRead === 1 || n.isRead === 'true',
          timestamp: new Date(n.timestamp)
        })) as TripNotification[];

        // Store all for reference
        this.allNotifications = allDbNotifications;

        // DEBUG: Log all notification types
        console.log('🔍 Notification types in DB:', allDbNotifications.map(n => ({ type: n.type, title: n.title, message: n.message })));

        // FILTER: Keep ALL notifications (no filter for testing)
        const relevantNotifications = allDbNotifications; // Take ALL notifications for now

        if (pageIndex === 0) {
          // First page - replace with relevant notifications only
          this.notifications = relevantNotifications;
        } else {
          // Subsequent pages - append (check duplicates)
          const existingIds = new Set(this.notifications.map((n: TripNotification) => n.id));
          const uniqueNew = relevantNotifications.filter((n: TripNotification) => !existingIds.has(n.id));
          this.notifications = [...this.notifications, ...uniqueNew];
        }

        // Count ONLY unread relevant notifications
        this.unreadNotificationsCount = this.notifications.filter((n: TripNotification) => !n.isRead).length;

        this.totalNotifications = response.data.totalCount || 0;
        this.hasMoreNotifications = this.notifications.length < this.totalNotifications;

        console.log('📚 DB Load - Relevant notifications:', this.notifications.length);
        console.log('📚 Unread count:', this.unreadNotificationsCount);
        console.log('📚 Relevant notifications:', relevantNotifications);
      } else {
        console.warn('⚠️ Invalid notification response:', response);
        // Initialize with empty arrays on invalid response
        this.notifications = [];
        this.allNotifications = [];
        this.unreadNotificationsCount = 0;
      }
    },
    error: (err) => {
      console.error('❌ Error loading notifications from database:', err);
      // Initialize with empty arrays on error
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

      // Ensure isRead is boolean and timestamp is Date
      const processedNotifications = realtimeNotifications.map(n => ({
        ...n,
        isRead: n.isRead === true,
        timestamp: new Date(n.timestamp)
      }));

      // Store ALL real-time notifications for reference
      this.allNotifications = [...this.allNotifications, ...processedNotifications];

      // FILTER: Keep ALL relevant notification types (not just cancelled)
      const newRelevant = processedNotifications.filter((n: TripNotification) =>
        n.type === 'TRIP_CANCELLED' ||
        n.type === 'TRIP_ACCEPTED' ||
        n.type === 'TRIP_REJECTED' ||
        n.type === 'NEW_TRIP_ASSIGNMENT' ||
        n.type === 'STATUS_CHANGE'
      );

      // Add new relevant notifications to existing notifications (avoid duplicates)
      if (newRelevant.length > 0) {
        // Check for duplicates by ID
        const existingIds = new Set(this.notifications.map((n: TripNotification) => n.id));
        const uniqueNew = newRelevant.filter((n: TripNotification) => !existingIds.has(n.id));

        // Add to beginning of array
        this.notifications = [...uniqueNew, ...this.notifications];

        console.log('✅ Added new relevant notifications:', uniqueNew.length);
      }

      // Count ONLY unread relevant notifications
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
        // Handle both array and paged response
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

  openNotificationPanel() {
    this.showNotificationsPanel = !this.showNotificationsPanel;
  }

  openNotification() {
    if (this.cancelledTripsCount === 0) {
      alert('Aucun voyage annulé');
      return;
    }


    this.showNotificationsPanel = true;
  }

  viewTripDetails(tripId?: number) {
    if (tripId) {


      this.showNotificationsPanel = false;
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
    this.unreadNotificationsCount = this.notifications.filter((n: TripNotification) => !n.isRead).length;
  }
}

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'STATUS_CHANGE':
        return 'sync';
      case 'TRIP_CANCELLED':
        return 'cancel';
      case 'TRIP_ACCEPTED':
        return 'check_circle';
      case 'TRIP_REJECTED':
        return 'cancel';
      case 'NEW_TRIP_ASSIGNMENT':
        return 'add_circle';
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

  toggleMaintenance() { this.maintenanceOpen = !this.maintenanceOpen; }
  toggleUserMenu() { this.userMenuOpen = !this.userMenuOpen; }

  logout() {
    this.signalRService.disconnect();
    this.authService.logout();
  }

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