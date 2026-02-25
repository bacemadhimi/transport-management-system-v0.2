// src/app/app.ts
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
import { SignalRService, TripNotification } from './services/signalr.service';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { Translation } from './services/Translation';
import { environment } from '../environments/environment';

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

  cancelledTrips: any[] = [];
  cancelledTripsCount = 0;
  notifications: TripNotification[] = [];
  unreadNotificationsCount = 0;
  showNotificationsPanel = false;
  refreshNotificationInterval: any;

  // Property for tab selection
  selectedNotificationTab: 'all' | 'unread' = 'all';
  
  // Optional: Show online dot
  showOnlineDot = true;

  private notificationsSubscription!: Subscription;
  private cancelledTripsSubscription!: Subscription;
  private connectionStatusSubscription!: Subscription;

  constructor(
    private themeService: ThemeService
  ) {
    this.themes = this.themeService.getThemes();
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  // Computed property for filtered notifications
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
    
    // Load first page of notifications
    this.loadNotificationsFromDatabase(0, this.pageSize);
  }
  
  this.loadCancelledTrips();
  
  // Set up interval for backup polling
  this.refreshNotificationInterval = setInterval(() => {
    if (!this.signalRService['connectionStatusSubject'].value) {
      this.loadCancelledTrips();
      this.refreshNotifications(); // Use refresh instead of direct load
    }
  }, 30000);
}
loadNotificationsFromDatabase(pageIndex: number = 0, pageSize: number = 20) {
  this.http.get(`${environment.apiUrl}/api/notifications?pageIndex=${pageIndex}&pageSize=${pageSize}`).subscribe({
    next: (response: any) => {
      if (response.success) {
        if (pageIndex === 0) {
          // First page - replace notifications
          this.notifications = response.data.notifications;
        } else {
          // Subsequent pages - append
          this.notifications = [...this.notifications, ...response.data.notifications];
        }
        
        this.unreadNotificationsCount = response.data.unreadCount;
        this.totalNotifications = response.data.totalCount;
        
        // Check if there are more notifications to load
        this.hasMoreNotifications = this.notifications.length < this.totalNotifications;
        
        console.log('📋 Loaded notifications from database:', this.notifications.length, 'Total:', this.totalNotifications);
      }
    },
    error: (err) => console.error('Error loading notifications from database:', err)
  });
}
loadMoreNotifications() {
  this.currentPage++;
  this.loadNotificationsFromDatabase(this.currentPage, this.pageSize);
}

// Reset and reload from beginning
refreshNotifications() {
  this.currentPage = 0;
  this.loadNotificationsFromDatabase(0, this.pageSize);
}
initializeSignalR() {
  // Subscribe to notifications
  this.notificationsSubscription = this.signalRService.notifications$.subscribe(
    notifications => {
      this.notifications = notifications;
      this.unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
      console.log('📋 Notifications loaded:', notifications.length);
    }
  );

  // Subscribe to unread count updates
  this.signalRService.unreadCount$.subscribe(
    count => {
      this.unreadNotificationsCount = count;
    }
  );

  // Subscribe to connection status
  this.connectionStatusSubscription = this.signalRService.connectionStatus$.subscribe(
    isConnected => {
      console.log('SignalR connection status:', isConnected ? 'Connected' : 'Disconnected');
      if (isConnected) {
        this.signalRService.requestNotificationPermission();
      }
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
        this.cancelledTrips = res?.data?.filter((t: any) => t.tripStatus === 'Cancelled') ?? [];
        this.cancelledTripsCount = this.cancelledTrips.length;
      },
      error: (err) => console.error('Erreur notification:', err)
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
    
    // Show notifications panel instead of alert
    this.showNotificationsPanel = true;
  }

  viewTripDetails(tripId?: number) {
    if (tripId) {
      // Navigate to trip details
      // this.router.navigate(['/trips', tripId]);
      this.showNotificationsPanel = false;
    }
  }

async markAllNotificationsAsRead() {
  await this.signalRService.markAllAsRead();
}

clearAllNotifications() {
  this.signalRService.clearNotifications();
}

  // Mark a single notification as read
async markNotificationAsRead(notification: TripNotification) {
  if (!notification.isRead) {
    await this.signalRService.markAsRead(notification.id);
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

  // Method to get time ago string (Facebook style)
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

  // View all notifications
  viewAllNotifications() {
    // Navigate to notifications page or expand panel
    console.log('View all notifications');
    // You can implement navigation to a full notifications page
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
    
    // Unsubscribe from SignalR observables
    this.notificationsSubscription?.unsubscribe();
    this.cancelledTripsSubscription?.unsubscribe();
    this.connectionStatusSubscription?.unsubscribe();
    
    // Disconnect SignalR
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