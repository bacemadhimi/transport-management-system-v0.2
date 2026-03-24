import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  driverId: number;
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  source?: string;
  isConfident: boolean;
  context?: {
    tripReference?: string;
    status?: string;
    deliveriesCount?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private readonly OLLAMA_URL = 'http://localhost:11434/api/chat';
  private readonly MODEL = 'llama3';
  
  constructor(private http: HttpClient) {}

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Fetch real data context before sending to Ollama
      const dataContext = await this.fetchDataContext(request.driverId);
      
      // Build enhanced system prompt with real data
      const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(dataContext);
      
      // Build conversation messages for Ollama
      const messages: any[] = [
        { role: 'system', content: enhancedSystemPrompt }
      ];

      // Add conversation history
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        request.conversationHistory.slice(-10).forEach(msg => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Add current user message
      messages.push({ role: 'user', content: request.message });

      // Call Ollama API with better options
      const response = await firstValueFrom(
        this.http.post<any>(this.OLLAMA_URL, {
          model: this.MODEL,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.8,
            top_p: 0.9,
            top_k: 40,
            num_predict: 800,
            repeat_penalty: 1.1
          }
        })
      );

      if (response && response.message && response.message.content) {
        return {
          message: response.message.content.trim(),
          source: 'ollama-llama3',
          isConfident: true,
          context: dataContext
        };
      } else {
        throw new Error('Invalid response from Ollama');
      }
    } catch (error) {
      console.error('Ollama chatbot error:', error);
      // Use intelligent fallback
      return this.getIntelligentFallback(request.message, request.driverId);
    }
  }

  private async fetchDataContext(driverId: number): Promise<any> {
    const context: any = {
      trips: [],
      deliveries: [],
      notifications: [],
      currentTrip: null,
      pendingDeliveries: 0,
      completedDeliveries: 0,
      unreadNotifications: 0,
      driverName: '',
      truckInfo: null
    };

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('⚠️ No token found');
        return context;
      }

      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = environment.apiUrl;

      // Fetch trips
      try {
        const tripsResponse = await firstValueFrom(
          this.http.get<any>(`${baseUrl}/api/Trips/my-trips`, { headers })
        );
        if (tripsResponse?.data) {
          context.trips = Array.isArray(tripsResponse.data) ? tripsResponse.data : [tripsResponse.data];
          context.currentTrip = context.trips.find((t: any) => 
            t.status === 'InProgress' || t.status === 'Loading' || t.status === 'InDelivery'
          );
        }
      } catch (e) {
        console.log('Could not fetch trips');
      }

      // Fetch deliveries
      if (context.currentTrip?.deliveries) {
        context.deliveries = context.currentTrip.deliveries;
        context.pendingDeliveries = context.deliveries.filter((d: any) => 
          d.status === 'Pending' || d.status === 'Assigned'
        ).length;
        context.completedDeliveries = context.deliveries.filter((d: any) => 
          d.status === 'Delivered' || d.status === 'Completed'
        ).length;
      }

      // Fetch notifications
      try {
        const notifResponse = await firstValueFrom(
          this.http.get<any>(`${baseUrl}/api/Notifications?pageIndex=0&pageSize=20`, { headers })
        );
        if (notifResponse?.data) {
          context.notifications = Array.isArray(notifResponse.data) ? notifResponse.data : [];
          context.unreadNotifications = context.notifications.filter((n: any) => !n.isRead).length;
        }
      } catch (e) {
        console.log('Could not fetch notifications');
      }

      // Fetch driver info
      try {
        const userResponse = await firstValueFrom(
          this.http.get<any>(`${baseUrl}/api/User/profile`, { headers })
        );
        if (userResponse?.data) {
          context.driverName = userResponse.data.name || userResponse.data.firstName || '';
        }
      } catch (e) {
        console.log('Could not fetch user profile');
      }

    } catch (error) {
      console.error('Error fetching context:', error);
    }

    return context;
  }

  private buildEnhancedSystemPrompt(context: any): string {
    let systemPrompt = `Tu es un assistant IA professionnel pour TMS (Transport Management System).

Tu réponds à TOUTES les questions de manière intelligente et naturelle.

INSTRUCTIONS:
1. Réponds TOUJOURS en français
2. Sois naturel, amical et professionnel
3. Utilise des emojis
4. Utilise les données réelles ci-dessous pour les questions sur trajets/livraisons

DONNÉES DU CHAUFFEUR:
`;

    if (context.driverName) {
      systemPrompt += `👤 Chauffeur: ${context.driverName}\n`;
    }

    if (context.currentTrip) {
      systemPrompt += `
🚗 TRAJET ACTUEL:
- Référence: ${context.currentTrip.tripReference || 'N/A'}
- Statut: ${this.getStatusLabel(context.currentTrip.status)}
- Livraisons: ${context.pendingDeliveries} en attente, ${context.completedDeliveries} terminées
- Destination: ${context.currentTrip.destinationAddress || 'Non définie'}
`;
    } else {
      systemPrompt += `🚗 Aucun trajet actif\n`;
    }

    if (context.deliveries?.length > 0) {
      systemPrompt += `📦 ${context.deliveries.length} livraison(s) au total\n`;
    }

    if (context.unreadNotifications > 0) {
      systemPrompt += `🔔 ${context.unreadNotifications} notification(s) non lue(s)\n`;
    }

    return systemPrompt;
  }

  private getStatusLabel(status: string): string {
    const labels: any = {
      'Pending': 'En attente', 'Assigned': 'Assigné', 'InProgress': 'En cours',
      'Loading': 'Chargement', 'InDelivery': 'Livraison', 'Completed': 'Terminé', 'Cancelled': 'Annulé'
    };
    return labels[status] || status;
  }

  private async getIntelligentFallback(message: string, driverId: number): Promise<ChatResponse> {
    const lowerMsg = message.toLowerCase().trim();
    
    // Fetch context silently
    let context;
    try {
      context = await this.fetchDataContext(driverId);
    } catch (e) {
      context = { deliveries: [], currentTrip: null, notifications: [], unreadNotifications: 0 };
    }
    
    // ===== DESTINATION / OÙ =====
    if (this.isDestinationQuestion(lowerMsg)) {
      if (context.currentTrip) {
        const nextDelivery = context.deliveries?.find((d: any) => 
          d.status === 'Pending' || d.status === 'Assigned'
        );
        
        if (nextDelivery) {
          return {
            message: `📍 **Votre destination actuelle:**\n\n` +
                     `🏠 **Adresse:** ${nextDelivery.deliveryAddress || 'Non disponible'}\n\n` +
                     `${nextDelivery.customerName ? `👤 **Client:** ${nextDelivery.customerName}\n` : ''}` +
                     `${nextDelivery.scheduledTime ? `⏰ **Heure prévue:** ${nextDelivery.scheduledTime}\n` : ''}` +
                     `\n📱 **Utilisez le GPS** pour y accéder directement !`,
            source: 'intelligent-fallback',
            isConfident: true
          };
        } else {
          return {
            message: `📍 **Destination actuelle:**\n\n` +
                     `🏠 ${context.currentTrip.destinationAddress || 'Non définie'}\n\n` +
                     `✅ Toutes les livraisons sont terminées !\n\n` +
                     `🎉 Félicitations !`,
            source: 'intelligent-fallback',
            isConfident: true
          };
        }
      } else {
        return {
          message: `📍 **Aucune destination définie**\n\n` +
                   `Vous n'avez pas de trajet actif.\n\n` +
                   `💡 Consultez "Mes Trajets" pour voir vos missions.`,
          source: 'intelligent-fallback',
          isConfident: true
        };
      }
    }
    
    // ===== DELIVERIES =====
    if (this.isDeliveryQuestion(lowerMsg)) {
      if (context.deliveries?.length > 0) {
        const pending = context.deliveries.filter((d: any) => d.status === 'Pending' || d.status === 'Assigned').length;
        const completed = context.deliveries.filter((d: any) => d.status === 'Delivered' || d.status === 'Completed').length;
        
        let response = `📦 **Vos livraisons:**\n\n`;
        response += `• **En attente:** ${pending}\n`;
        response += `• **Terminées:** ${completed}\n`;
        response += `• **Total:** ${context.deliveries.length}\n`;
        
        const next = context.deliveries.find((d: any) => d.status === 'Pending' || d.status === 'Assigned');
        if (next) {
          response += `\n📍 **Prochaine:** ${next.deliveryAddress || 'N/A'}`;
        }
        
        return { message: response, source: 'intelligent-fallback', isConfident: true };
      } else {
        return {
          message: `📦 **Aucune livraison**\n\nVous n'avez pas de livraison assignée.\n\n💡 Consultez "Mes Trajets" pour voir les missions.`,
          source: 'intelligent-fallback', isConfident: true
        };
      }
    }
    
    // ===== TRIP =====
    if (this.isTripQuestion(lowerMsg)) {
      if (context.currentTrip) {
        return {
          message: `🗺️ **Votre trajet:**\n\n` +
                   `• Réf: ${context.currentTrip.tripReference}\n` +
                   `• Statut: ${this.getStatusLabel(context.currentTrip.status)}\n` +
                   `• Livraisons: ${context.deliveries?.length || 0}\n\n` +
                   `📱 Utilisez le GPS pour naviguer.`,
          source: 'intelligent-fallback', isConfident: true
        };
      } else {
        return {
          message: `🗺️ **Aucun trajet actif**\n\n📋 Pas de trajet en cours.\n\n💡 Consultez "Mes Trajets" ou contactez votre superviseur.`,
          source: 'intelligent-fallback', isConfident: true
        };
      }
    }
    
    // ===== NOTIFICATIONS =====
    if (this.isNotificationQuestion(lowerMsg)) {
      if (context.notifications?.length > 0) {
        const unread = context.notifications.filter((n: any) => !n.isRead);
        let response = `🔔 **Notifications:**\n\n`;
        
        if (unread.length > 0) {
          response += `📬 **${unread.length} non lue(s):**\n\n`;
          unread.slice(0, 3).forEach((n: any, i: number) => {
            response += `${i + 1}. ${n.title || 'Notification'}\n`;
            if (n.message) response += `   ${n.message.substring(0, 60)}...\n`;
          });
        } else {
          response += '✅ Toutes lues !';
        }
        return { message: response, source: 'intelligent-fallback', isConfident: true };
      } else {
        return { message: '🔔 Aucune notification.', source: 'intelligent-fallback', isConfident: true };
      }
    }
    
    // ===== WEATHER =====
    if (this.isWeatherQuestion(lowerMsg)) {
      return {
        message: '🌤️ **Météo**\n\nJe n\'ai pas accès aux données météo.\n\n💡 Consultez votre app météo avant de partir.',
        source: 'intelligent-fallback', isConfident: true
      };
    }
    
    // ===== TIME =====
    if (this.isTimeQuestion(lowerMsg)) {
      const now = new Date();
      return {
        message: `🕐 **${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}**\n📅 ${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
        source: 'intelligent-fallback', isConfident: true
      };
    }
    
    // ===== GREETINGS =====
    if (this.isGreeting(lowerMsg)) {
      const hour = new Date().getHours();
      let greeting = hour < 12 ? '☀️ Bonjour!' : hour < 18 ? '🌤️ Bon après-midi!' : '🌙 Bonsoir!';
      if (context.driverName) greeting += ` ${context.driverName}!`;
      if (context.currentTrip) greeting += `\n\n🚛 Trajet actif: ${context.currentTrip.tripReference}`;
      greeting += '\n\nComment puis-je aider? 😊';
      return { message: greeting, source: 'intelligent-fallback', isConfident: true };
    }
    
    // ===== DEFAULT =====
    return {
      message: '🤖 **Assistant IA TMS**\n\nJe peux aider avec:\n• Trajets & livraisons\n• Notifications\n• Heure & date\n• Conseils\n• Questions générales\n\n💬 Posez votre question !',
      source: 'intelligent-fallback', isConfident: false
    };
  }

  // ===== PATTERN MATCHING =====
  private isDestinationQuestion(msg: string): boolean {
    return ['destination', 'où', 'ou', 'adresse', 'endroit', 'lieu', 'arriver', 'arrive'].some(k => msg.includes(k));
  }
  private isWeatherQuestion(msg: string): boolean {
    return ['météo', 'meteo', 'temps', 'weather', 'pleut', 'soleil', 'nuage', 'vent', 'température'].some(k => msg.includes(k));
  }
  private isTimeQuestion(msg: string): boolean {
    return ['heure', 'date', 'jour', 'time'].some(k => msg.includes(k));
  }
  private isDeliveryQuestion(msg: string): boolean {
    return ['livraison', 'delivery', 'combien', 'colis', 'package'].some(k => msg.includes(k));
  }
  private isTripQuestion(msg: string): boolean {
    return ['trajet', 'route', 'itinéraire', 'mission', 'tournee'].some(k => msg.includes(k));
  }
  private isNotificationQuestion(msg: string): boolean {
    return ['notification', 'alerte', 'message', 'notif', 'nouveau'].some(k => msg.includes(k));
  }
  private isGreeting(msg: string): boolean {
    return ['bonjour', 'salut', 'hello', 'coucou', 'hey', 'bonsoir', 'ça va'].some(k => msg.includes(k));
  }

  async getSuggestions(): Promise<string[]> {
    return [
      '📦 Combien de livraisons?',
      '📍 Où est ma destination?',
      '🗺️ Statut du trajet?',
      '🔔 Notifications?',
      '🕐 Quelle heure?'
    ];
  }
}