import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  tripId?: number;
  messageType: 'Text' | 'Image' | 'Location';
  attachmentUrl?: string;
}

export interface ChatConversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  userRole: string;
}

export interface OnlineUser {
  userId: number;
  userName: string;
  isOnline: boolean;
  lastSeen?: Date;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRChatService {
  private chatHubConnection!: signalR.HubConnection;
  private authService = inject(AuthService);
  
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private onlineUsersSubject = new BehaviorSubject<OnlineUser[]>([]);
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private newMessageSubject = new BehaviorSubject<ChatMessage | null>(null);
  public newMessage$ = this.newMessageSubject.asObservable();

  private currentConversationId: string | null = null;

  constructor() {
    this.initializeChatConnection();
  }

  private initializeChatConnection() {
    const token = this.authService.getToken();
    if (!token) {
        console.warn('No token available for SignalR connection');
        return;
    }

    console.log('Initializing chat connection with token:', token.substring(0, 20) + '...');

    this.chatHubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${environment.apiUrl}/chathub`, {
            accessTokenFactory: () => token,
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .build();

    this.startChatConnection();
    this.registerChatHandlers();
  }

  private startChatConnection() {
    console.log('Starting chat connection...');
    
    this.chatHubConnection
      .start()
      .then(() => {
        console.log('✅ Chat SignalR connected');
        console.log('Connection ID:', this.chatHubConnection.connectionId);
        this.connectionStatusSubject.next(true);
        
        setTimeout(() => {
          console.log('Requesting online users after connection...');
          this.getOnlineUsers();
        }, 1000);
      })
      .catch(err => {
        console.error('❌ Chat SignalR error: ', err);
        this.connectionStatusSubject.next(false);
        setTimeout(() => this.startChatConnection(), 5000);
      });

    this.chatHubConnection.onreconnecting(() => {
      console.log('🔄 Chat SignalR reconnecting...');
      this.connectionStatusSubject.next(false);
    });

    this.chatHubConnection.onreconnected(() => {
      console.log('✅ Chat SignalR reconnected');
      this.connectionStatusSubject.next(true);
      
    
      setTimeout(() => {
        console.log('Requesting online users after reconnection...');
        this.getOnlineUsers();
      }, 1000);
    });

    this.chatHubConnection.onclose(() => {
      console.log('🔌 Chat SignalR disconnected');
      this.connectionStatusSubject.next(false);
    });
  }

private registerChatHandlers() {
      this.chatHubConnection.on('OnlineUsers', (users: any[]) => {
    console.log('📋 SERVICE RECEIVED ONLINE USERS:', users);
    console.log('Number of users from server:', users?.length);
    
    if (users && users.length > 0) {
      const onlineUsers: OnlineUser[] = users.map(user => ({
        userId: user.userId,
        userName: user.userName,
        isOnline: true,
        lastSeen: user.lastSeen ? new Date(user.lastSeen) : undefined,
        email: user.email
      }));
      
      console.log('Mapped online users:', onlineUsers);
      this.onlineUsersSubject.next(onlineUsers);
    } else {
      console.log('No online users received from server');
      this.onlineUsersSubject.next([]);
    }
  });

  
  this.chatHubConnection.on('UserOnline', (userId: number, userName: string) => {
    console.log('🟢 User online:', userId, userName);
    

    const currentUsers = this.onlineUsersSubject.value;
    const existingUser = currentUsers.find(u => u.userId === userId);
    
    if (!existingUser) {
      const newUser: OnlineUser = {
        userId: userId,
        userName: userName,
        isOnline: true,
        lastSeen: new Date()
      };
      this.onlineUsersSubject.next([...currentUsers, newUser]);
    }
  });


  this.chatHubConnection.on('UserOffline', (userId: number) => {
    console.log('🔴 User offline:', userId);
    
   
    const currentUsers = this.onlineUsersSubject.value;
    this.onlineUsersSubject.next(currentUsers.filter(u => u.userId !== userId));
  });

  this.chatHubConnection.on('LoadConversation', (messages: ChatMessage[]) => {
    console.log('📚 SERVICE LoadConversation received:', messages);
    console.log('Number of messages from server:', messages?.length);
    
    if (messages && messages.length > 0) {
      // Process messages
      const processedMessages = messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
      
      console.log('Processed messages:', processedMessages);
      this.messagesSubject.next(processedMessages);
    } else {
      console.log('No messages in conversation');
      this.messagesSubject.next([]);
    }
  });

  // Message sent confirmation - THIS IS KEY
  this.chatHubConnection.on('MessageSent', (message: ChatMessage) => {
    console.log('✅ SERVICE Message sent confirmation:', message);
    
    // Update the message in the current conversation if needed
    const currentMessages = this.messagesSubject.value;
    const existingMessageIndex = currentMessages.findIndex(m => m.id === 0 && m.timestamp === message.timestamp);
    
    if (existingMessageIndex !== -1) {
      // Replace temporary message with confirmed one
      currentMessages[existingMessageIndex] = {
        ...message,
        timestamp: new Date(message.timestamp)
      };
      this.messagesSubject.next([...currentMessages]);
    }
  });

  // Receive new message
  this.chatHubConnection.on('ReceiveMessage', (message: ChatMessage) => {
    console.log('📬 SERVICE ReceiveMessage:', message);
    console.log('Current conversation ID:', this.currentConversationId);
    console.log('Message sender ID:', message.senderId);
    
    const processedMessage = {
      ...message,
      timestamp: new Date(message.timestamp)
    };
    
    this.newMessageSubject.next(processedMessage);
    
    // Check if this message belongs to current conversation
    const isCurrentConversation = this.currentConversationId && 
      (message.senderId === this.currentConversationId || 
       message.receiverId === this.currentConversationId);
    
    console.log('Is current conversation?', isCurrentConversation);
    
    if (isCurrentConversation) {
      const currentMessages = this.messagesSubject.value;
      console.log('Adding to current messages. Before:', currentMessages.length);
      
      // Add the message and sort by timestamp
      const updatedMessages = [...currentMessages, processedMessage].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      this.messagesSubject.next(updatedMessages);
      console.log('After:', updatedMessages.length);
    }
    
    // Update unread count if message is for current user and not in current conversation
    if (message.receiverId === this.authService.getCurrentUserIdString() && 
        message.senderId !== this.currentConversationId) {
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    }
  });
}
  // Send a message
// services/signalr-chat.service.ts

async sendMessage(receiverId: string, message: string, 
                 messageType: 'Text' | 'Image' | 'Location' = 'Text',
                 attachmentUrl?: string,
                 tripId?: number): Promise<void> {
  
  const chatMessage: ChatMessage = {
    id: 0, // Temporary ID
    senderId: this.authService.getCurrentUserIdString(),
    senderName: this.authService.getCurrentUserName(),
    receiverId: receiverId,
    message: message,
    timestamp: new Date(),
    isRead: false,
    messageType: messageType,
    attachmentUrl: attachmentUrl || '',
    tripId: tripId
  };

  console.log('📤 SERVICE sending message:', chatMessage);
  
  try {
    // Add to current conversation immediately for better UX
    if (this.currentConversationId === receiverId) {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, chatMessage]);
    }
    
    // Send to server
    await this.chatHubConnection.invoke('SendMessage', chatMessage);
    console.log('✅ SERVICE message sent');
  } catch (error) {
    console.error('❌ SERVICE error sending message:', error);
    
    // Remove the message if send failed
    if (this.currentConversationId === receiverId) {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next(
        currentMessages.filter(m => m.timestamp !== chatMessage.timestamp)
      );
    }
    throw error;
  }
}

  // Load conversation with specific user
  async loadConversation(otherUserId: string): Promise<void> {
    console.log('Loading conversation with user:', otherUserId);
    this.currentConversationId = otherUserId;
    await this.chatHubConnection.send('GetConversation', otherUserId);
  }

  // Get online users - THIS WAS MISSING
  async getOnlineUsers(): Promise<void> {
    console.log('📞 Calling GetOnlineUsers on hub...');
    console.log('Connection state:', this.chatHubConnection?.state);
    
    if (!this.chatHubConnection) {
      console.error('❌ Chat hub connection not initialized');
      return;
    }
    
    if (this.chatHubConnection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ Chat hub not connected. Current state:', this.chatHubConnection.state);
      return;
    }
    
    try {
      await this.chatHubConnection.invoke('GetOnlineUsers');
      console.log('✅ GetOnlineUsers invoked successfully');
    } catch (error) {
      console.error('❌ Error invoking GetOnlineUsers:', error);
    }
  }

  // Get active drivers (keeping for backward compatibility)
  async getActiveDrivers(tripId?: number): Promise<void> {
    console.log('Getting active drivers for trip:', tripId);
    await this.chatHubConnection.send('GetActiveDrivers', tripId || 0);
  }

  // Mark message as read
  async markMessageAsRead(messageId: number): Promise<void> {
    console.log('Marking message as read:', messageId);
    await this.chatHubConnection.send('MarkMessageAsRead', messageId);
  }

  // Update conversations list
  private updateConversations(message: ChatMessage) {
    const conversations = this.conversationsSubject.value;
    const currentUserId = this.authService.getCurrentUserIdString();
    const otherUserId = message.senderId === currentUserId 
      ? message.receiverId 
      : message.senderId;
    
    const existingConv = conversations.find(c => c.userId === otherUserId);
    
    if (existingConv) {
      existingConv.lastMessage = message.message;
      existingConv.lastMessageTime = message.timestamp;
      if (message.receiverId === currentUserId && !message.isRead) {
        existingConv.unreadCount++;
      }
    } else {
      conversations.push({
        userId: otherUserId,
        userName: message.senderName,
        lastMessage: message.message,
        lastMessageTime: message.timestamp,
        unreadCount: message.receiverId === currentUserId ? 1 : 0,
        isOnline: false,
        userRole: 'Driver'
      });
    }
    
    this.conversationsSubject.next([...conversations].sort((a, b) => 
      b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
    ));
  }

  private updateUserOnlineStatus(userId: string, isOnline: boolean) {
    const conversations = this.conversationsSubject.value;
    const conv = conversations.find(c => c.userId === userId);
    if (conv) {
      conv.isOnline = isOnline;
      this.conversationsSubject.next([...conversations]);
    }
  }


  async checkConnection(): Promise<boolean> {
    return this.chatHubConnection?.state === signalR.HubConnectionState.Connected;
  }


  disconnect() {
    if (this.chatHubConnection) {
      console.log('Disconnecting chat...');
      this.chatHubConnection.stop();
    }
  }
}