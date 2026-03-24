import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonicModule, 
  IonContent, 
  AlertController,
  ToastController
} from '@ionic/angular';
import { SignalRChatService, OnlineUser, ChatMessage } from '../../services/signalr-chat.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Network } from '@capacitor/network';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild(IonContent) content!: IonContent;

  onlineUsers: OnlineUser[] = [];
  messages: ChatMessage[] = [];
  selectedUser: OnlineUser | null = null;
  newMessage: string = '';
  currentUserId: number;  
  currentUserIdString: string;  
  currentUserName: string;
  isLoading: boolean = false;
  connectionStatus: boolean = false;  
  
  // Offline mode flags
  isOnline: boolean = true;
  offlineMode: boolean = false;
  private networkListener: any;
  
  // Storage keys
  private readonly USERS_CACHE_KEY = 'chat_cached_users';
  private readonly MESSAGES_CACHE_PREFIX = 'chat_messages_';
  private readonly SELECTED_USER_KEY = 'chat_selected_user';
  private readonly PENDING_MESSAGES_KEY = 'chat_pending_messages';

  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: SignalRChatService,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) {
    this.currentUserId = this.authService.getCurrentUserId();
    this.currentUserIdString = this.authService.getCurrentUserIdString();
    this.currentUserName = this.authService.getCurrentUserName();
  }

  async ngOnInit() {
    console.log('ChatComponent initialized');
    console.log('Current user:', { 
      id: this.currentUserId, 
      idString: this.currentUserIdString,
      name: this.currentUserName 
    });
    
    await this.checkNetworkStatus();
    this.setupNetworkListener();
    
    // Always load from cache first for offline viewing
    this.loadCachedUsers();
    this.restoreLastSelectedUser();
    
    this.isLoading = true;

    this.subscriptions.push(
      this.chatService.connectionStatus$.subscribe(status => {
        this.connectionStatus = status;
        console.log('SignalR connection status:', status ? 'Connected' : 'Disconnected');
        
        if (status && this.isOnline) {
          console.log('🟢 Connection established, getting online users...');
          this.chatService.getOnlineUsers();
        }
      })
    );

    this.subscriptions.push(
      this.chatService.onlineUsers$.subscribe(users => {
        console.log('📋 Component received online users:', users);
        const filteredUsers = users.filter(u => u.userId !== this.currentUserId);
        console.log('Filtered users (excluding self):', filteredUsers);
        this.onlineUsers = filteredUsers;
        this.isLoading = false;
        this.cacheUsers(filteredUsers);
      })
    );

    this.subscriptions.push(
      this.chatService.messages$.subscribe(messages => {
        console.log('📨 Component received messages:', messages);
        
        if (messages && messages.length > 0) {
          this.messages = messages;
          this.cacheMessages(messages, this.selectedUser?.userId);
          setTimeout(() => this.scrollToBottom(), 200);
        } else {
          console.log('No messages in conversation');
          this.messages = [];
        }
      })
    );

    this.subscriptions.push(
      this.chatService.newMessage$.subscribe(message => {
        console.log('📬 Component new message received:', message);
        if (message && this.selectedUser?.userId.toString() === message.senderId) {
          console.log('Marking message as read:', message.id);
          this.markMessageAsRead(message.id);
          this.saveMessageToCache(message);
        }
      })
    );

    // Only try to get online users if connected
    if (this.isOnline) {
      setTimeout(() => {
        console.log('⏰ Initial GetOnlineUsers call after 1 second');
        this.chatService.getOnlineUsers();
      }, 1000);

      setTimeout(() => {
        console.log('⏰ Initial GetOnlineUsers call after 3 seconds');
        this.chatService.getOnlineUsers();
      }, 3000);
    } else {
      this.isLoading = false;
      this.showToast('Hors ligne - Affichage des chats en cache', 'warning');
    }
  }

  private async checkNetworkStatus() {
    try {
      const status = await Network.getStatus();
      this.isOnline = status.connected;
      this.offlineMode = !this.isOnline;
      console.log('Network status:', this.isOnline ? 'online' : 'offline');
    } catch (error) {
      console.error('Error checking network:', error);
      this.isOnline = false;
      this.offlineMode = true;
    }
  }

  private setupNetworkListener() {
    Network.addListener('networkStatusChange', async (status) => {
      const wasOffline = !this.isOnline;
      this.isOnline = status.connected;
      this.offlineMode = !this.isOnline;
      
      console.log('Network changed:', this.isOnline ? 'online' : 'offline');
      
      if (wasOffline && this.isOnline) {
        // Just came online - sync pending messages and refresh
        await this.syncPendingMessages();
        this.showToast('Connexion rétablie - Synchronisation des messages...', 'success');
        this.chatService.getOnlineUsers();
        
        // Reload current conversation if any
        if (this.selectedUser) {
          await this.loadConversation(this.selectedUser.userId);
        }
      } else if (!wasOffline && !this.isOnline) {
        this.showToast('Vous êtes hors ligne - Affichage des messages en cache', 'warning');
      }
    });
  }

  private cacheUsers(users: OnlineUser[]) {
    try {
      localStorage.setItem(this.USERS_CACHE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error caching users:', error);
    }
  }

  private loadCachedUsers() {
    try {
      const cached = localStorage.getItem(this.USERS_CACHE_KEY);
      if (cached) {
        this.onlineUsers = JSON.parse(cached);
        console.log('Loaded users from cache:', this.onlineUsers.length);
      }
    } catch (error) {
      console.error('Error loading cached users:', error);
    }
  }

  private cacheMessages(messages: ChatMessage[], userId?: number) {
    if (!userId) return;
    try {
      const key = `${this.MESSAGES_CACHE_PREFIX}${userId}`;
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error('Error caching messages:', error);
    }
  }

  private loadCachedMessages(userId: number): ChatMessage[] | null {
    try {
      const key = `${this.MESSAGES_CACHE_PREFIX}${userId}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const messages = JSON.parse(cached);
        // Convert date strings back to Date objects
        return messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading cached messages:', error);
    }
    return null;
  }

  private saveMessageToCache(message: ChatMessage) {
    if (!this.selectedUser) return;
    
    const cached = this.loadCachedMessages(this.selectedUser.userId) || [];
    cached.push(message);
    this.cacheMessages(cached, this.selectedUser.userId);
  }

  private savePendingMessage(message: ChatMessage) {
    try {
      const pending = localStorage.getItem(this.PENDING_MESSAGES_KEY);
      const pendingMessages = pending ? JSON.parse(pending) : [];
      pendingMessages.push({
        ...message,
        receiverId: this.selectedUser?.userId.toString()
      });
      localStorage.setItem(this.PENDING_MESSAGES_KEY, JSON.stringify(pendingMessages));
    } catch (error) {
      console.error('Error saving pending message:', error);
    }
  }

  private async syncPendingMessages() {
    try {
      const pending = localStorage.getItem(this.PENDING_MESSAGES_KEY);
      if (!pending) return;

      const pendingMessages = JSON.parse(pending);
      if (pendingMessages.length === 0) return;

      this.showToast(`Synchronisation de ${pendingMessages.length} message(s) en attente...`, 'primary');
      
      for (const msg of pendingMessages) {
        try {
          await this.chatService.sendMessage(msg.receiverId, msg.message);
          console.log('Synced pending message:', msg);
        } catch (error) {
          console.error('Failed to sync message:', error);
        }
      }

      localStorage.removeItem(this.PENDING_MESSAGES_KEY);
      this.showToast('Messages synchronisés avec succès', 'success');
    } catch (error) {
      console.error('Error syncing pending messages:', error);
    }
  }

  private restoreLastSelectedUser() {
    try {
      const saved = localStorage.getItem(this.SELECTED_USER_KEY);
      if (saved) {
        this.selectedUser = JSON.parse(saved);
        if (this.selectedUser) {
          const cachedMessages = this.loadCachedMessages(this.selectedUser.userId);
          if (cachedMessages) {
            this.messages = cachedMessages;
            setTimeout(() => this.scrollToBottom(), 200);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring last user:', error);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }

  async refreshOnlineUsers() {
    if (!this.isOnline) {
      this.showToast('Impossible d\'actualiser hors ligne', 'warning');
      return;
    }
    
    console.log('🔄 Manually refreshing online users...');
    this.isLoading = true;
    
    const isConnected = await this.chatService.checkConnection();
    console.log('Connection check:', isConnected);
    
    if (!isConnected) {
      this.showToast('Non connecté au serveur de chat', 'danger');
      this.isLoading = false;
      return;
    }
    
    await this.chatService.getOnlineUsers();
    
    setTimeout(() => {
      console.log('Online users after refresh:', this.onlineUsers);
      this.showToast(`${this.onlineUsers.length} chauffeur(s) en ligne`, 'success');
      this.isLoading = false;
    }, 1000);
  }

  async selectUser(user: OnlineUser) {
    console.log('🔵 Selected user:', user);
    
    this.selectedUser = user;
    this.messages = [];
    
    // Save selected user
    try {
      localStorage.setItem(this.SELECTED_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving selected user:', error);
    }
    
    // Load cached messages first
    const cachedMessages = this.loadCachedMessages(user.userId);
    if (cachedMessages) {
      this.messages = cachedMessages;
      setTimeout(() => this.scrollToBottom(), 200);
    }
    
    // Then try to load fresh if online
    if (this.isOnline) {
      await this.loadConversation(user.userId);
    } else {
      this.showToast('Hors ligne - Affichage des messages en cache', 'warning');
    }
  }

  async loadConversation(userId: number) {
    if (!this.isOnline) {
      return; // Already showing cached messages
    }
    
    console.log('🔄 Loading conversation with user:', userId);
    
    try {
      await this.chatService.loadConversation(userId.toString());
      console.log('✅ Load conversation called successfully');
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.selectedUser) return;

    const messageText = this.newMessage.trim();
    console.log('📤 Sending message to:', this.selectedUser.userId, 'Content:', messageText);
    
    const messageToSend: ChatMessage = {
      id: Date.now(), // Temporary ID
      senderId: this.currentUserIdString,
      senderName: this.currentUserName,
      receiverId: this.selectedUser.userId.toString(),
      message: messageText,
      timestamp: new Date(),
      isRead: false,
      messageType: 'Text',
      attachmentUrl: ''
    };
    
    // Add to UI immediately
    this.messages = [...this.messages, messageToSend];
    this.cacheMessages(this.messages, this.selectedUser.userId);
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 100);
    
    if (!this.isOnline) {
      // Save for later when offline
      this.savePendingMessage(messageToSend);
      this.showToast('Message enregistré localement - Envoyé lorsque la connexion sera rétablie', 'warning');
      return;
    }
    
    try {
      await this.chatService.sendMessage(
        this.selectedUser.userId.toString(),
        messageText
      );
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Save as pending if send fails
      this.savePendingMessage(messageToSend);
      this.showToast('Message enregistré - Nouvelle tentative lors de la reconnexion', 'warning');
    }
  }

  private setupMessageSubscription() {
    this.subscriptions.push(
      this.chatService.messages$.subscribe(messages => {
        console.log('📨 Component received messages update:', messages);
        
        if (messages && messages.length > 0) {
          const sortedMessages = [...messages].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          this.messages = sortedMessages;
          this.cacheMessages(sortedMessages, this.selectedUser?.userId);
          
          setTimeout(() => this.scrollToBottom(), 100);
        } else {
          this.messages = [];
        }
      })
    );
  }

  markMessageAsRead(messageId: number) {
    if (this.isOnline) {
      this.chatService.markMessageAsRead(messageId);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  async refreshUsers() {
    if (!this.isOnline) {
      this.showToast('Impossible d\'actualiser hors ligne', 'warning');
      return;
    }
    
    console.log('Refreshing users...');
    this.isLoading = true;
    await this.chatService.getOnlineUsers();
    setTimeout(() => this.isLoading = false, 500);
  }

  async showUserList() {
    if (this.onlineUsers.length === 0) {
      const message = this.offlineMode 
        ? 'Aucun utilisateur en cache disponible hors ligne'
        : 'Aucun autre chauffeur n\'est en ligne pour le moment.';
        
      const alert = await this.alertController.create({
        header: 'Aucun utilisateur disponible',
        message: message,
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: this.offlineMode ? 'Sélectionner un utilisateur (Mode hors ligne)' : 'Sélectionner un chauffeur',
      inputs: this.onlineUsers.map(user => ({
        type: 'radio',
        label: `${user.userName} ${user.isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}`,
        value: user.userId
      })),
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Chat',
          handler: (userId) => {
            const user = this.onlineUsers.find(u => u.userId === userId);
            if (user) {
              this.selectUser(user);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    if (this.selectedUser) {
      this.selectedUser = null;
      this.messages = [];
    } else {
      this.router.navigate(['/home']);
    }
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  isCurrentUser(senderId: string): boolean {
    return senderId === this.currentUserIdString;
  }

  // Helper methods for template
  getOfflineStatusText(): string {
    return this.offlineMode ? '📴 Mode Hors Ligne - Affichage des chats en cache' : '';
  }

  hasPendingMessages(): boolean {
    const pending = localStorage.getItem(this.PENDING_MESSAGES_KEY);
    return pending ? JSON.parse(pending).length > 0 : false;
  }
}