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
      if (response?.success && response?.data) {
        // Get ALL notifications from database and map them
        const allDbNotifications = (response.data.notifications || []).map((n: any) => ({
          ...n,
          // Convert isRead from number (0/1) to boolean
          isRead: n.isRead === true || n.isRead === 1 || n.isRead === 'true',
          timestamp: new Date(n.timestamp)
        })) as TripNotification[];

        // Store all for reference
        this.allNotifications = allDbNotifications;

        // STRICT FILTER: ONLY keep TRIP_CANCELLED
        const cancelledNotifications = allDbNotifications.filter((n: TripNotification) =>
          n.type === 'TRIP_CANCELLED'
        );

        if (pageIndex === 0) {
          // First page - replace with cancelled only
          this.notifications = cancelledNotifications;
        } else {
          // Subsequent pages - append cancelled only (check duplicates)
          const existingIds = new Set(this.notifications.map((n: TripNotification) => n.id));
          const uniqueNewCancelled = cancelledNotifications.filter((n: TripNotification) => !existingIds.has(n.id));
          this.notifications = [...this.notifications, ...uniqueNewCancelled];
        }

        // Count ONLY unread cancelled notifications
        this.unreadNotificationsCount = this.notifications.filter((n: TripNotification) => !n.isRead).length;

        this.totalNotifications = response.data.totalCount || 0;
        this.hasMoreNotifications = this.notifications.length < this.totalNotifications;

        console.log('📚 DB Load - Cancelled only:', this.notifications.length);
        console.log('📚 Unread count:', this.unreadNotificationsCount);
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

// Reset and reload from beginning
refreshNotifications() {
  this.currentPage = 0;
  this.loadNotificationsFromDatabase(0, this.pageSize);
}
initializeSignalR() {
  // Subscribe to real-time notifications
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
      
      // STRICT FILTER: ONLY keep TRIP_CANCELLED
      const newCancelled = processedNotifications.filter((n: TripNotification) => 
        n.type === 'TRIP_CANCELLED'
      );
      
      // Add new cancelled to existing notifications (avoid duplicates)
      if (newCancelled.length > 0) {
        // Check for duplicates by ID
        const existingIds = new Set(this.notifications.map((n: TripNotification) => n.id));
        const uniqueNewCancelled = newCancelled.filter((n: TripNotification) => !existingIds.has(n.id));
        
        // Add to beginning of array
        this.notifications = [...uniqueNewCancelled, ...this.notifications];
        
        console.log('✅ Added new cancelled notifications:', uniqueNewCancelled.length);
      }
      
      // Count ONLY unread cancelled notifications
      this.unreadNotificationsCount = this.notifications.filter((n: TripNotification) => !n.isRead).length;
      
      console.log('📋 Current cancelled notifications:', this.notifications.length);
      console.log('📋 Unread cancelled count:', this.unreadNotificationsCount);
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
  // Update local state
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

  // Mark a single notification as read
async markNotificationAsRead(notification: TripNotification) {
  if (!notification.isRead) {
    await this.signalRService.markAsRead(notification.id);
    // Update local state
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