import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
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

export interface DriverZoneInfo {
  id: number;
  name: string;
  currentCity?: string;
  currentZone?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private readonly OLLAMA_URL = 'http://localhost:11434/api/chat';
  private readonly MODEL = 'llama3';
  private readonly BACKEND_CHATBOT_URL = `${environment.apiUrl}/api/chatbot/message`;

  // Weather cache to avoid repeated API calls
  private weatherCache: Map<string, any> = new Map();

  constructor(private http: HttpClient) {}

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // ✅ PRIMARY: Call backend chatbot API with RAG
      const token = localStorage.getItem('token');
      if (token) {
        try {
          console.log('🤖 Calling backend chatbot API...');
          console.log('📤 Request:', JSON.stringify({
            driverId: request.driverId,
            message: request.message
          }));
          
          const backendResponse = await firstValueFrom(
            this.http.post<any>(this.BACKEND_CHATBOT_URL, {
              driverId: request.driverId,
              message: request.message,
              conversationHistory: request.conversationHistory?.slice(-10)
            }, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).pipe(
              catchError((err) => {
                console.error('❌ Backend chatbot error:', err.status, err.message);
                console.error('❌ Error details:', JSON.stringify(err.error));
                return of(null);
              })
            )
          );

          console.log('📡 Backend response:', JSON.stringify(backendResponse, null, 2));

          // Backend returns: { success: true, message: "Message sent", data: { message, source, isConfident, context } }
          if (backendResponse && backendResponse.success && backendResponse.data) {
            const data = backendResponse.data;
            console.log('✅ Using backend RAG response:', data.message?.substring(0, 100));
            console.log('📊 Response context:', JSON.stringify(data.context));
            return {
              message: data.message || "Désolé, je n'ai pas pu générer une réponse.",
              source: data.source || 'rag-backend',
              isConfident: data.isConfident || true,
              context: data.context || {}
            };
          } else {
            console.warn('⚠️ Backend returned invalid response:', JSON.stringify(backendResponse));
            console.warn('⚠️ Falling back to Ollama');
          }
        } catch (e) {
          console.error('❌ Backend chatbot exception:', e);
          console.warn('⚠️ Falling back to Ollama');
        }
      }

      // ✅ FALLBACK 1: Direct Ollama call with enhanced context
      return this.sendMessageViaOllama(request);
    } catch (error) {
      console.error('Chatbot error:', error);
      return this.getIntelligentFallback(request.message, request.driverId);
    }
  }

  private async sendMessageViaOllama(request: ChatRequest): Promise<ChatResponse> {
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
      driverZone: '',
      driverCity: '',
      truckInfo: null,
      otherDrivers: [],
      driversInSameZone: [],
      totalDistance: 0,
      estimatedArrival: null,
      nextDeliveryETA: null,
      weatherInfo: null
    };

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('⚠️ No token found');
        return context;
      }

      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = environment.apiUrl;

      // ✅ FIX 2a: Fetch trips using correct endpoint (PaginationAndSearch with driverId filter)
      try {
        const tripsResponse = await firstValueFrom(
          this.http.get<any>(`${baseUrl}/api/Trips/PaginationAndSearch?driverId=${driverId}&pageIndex=0&pageSize=50`, { headers })
        );

        if (tripsResponse?.data?.data) {
          // PaginationAndSearch returns PagedData { data: TripListDto[], totalData: number }
          context.trips = Array.isArray(tripsResponse.data.data) ? tripsResponse.data.data : [];

          // Find current active trip (statuses that indicate active trip)
          context.currentTrip = context.trips.find((t: any) =>
            t.tripStatus === 'Accepted' ||
            t.tripStatus === 'Loading' ||
            t.tripStatus === 'InDelivery' ||
            t.tripStatus === 'Arrived' ||
            t.tripStatus === 'Assigned'
          );

          // Calculate total distance
          context.totalDistance = context.trips.reduce((sum: number, t: any) =>
            sum + (t.estimatedDistance || 0), 0);

          // Estimate arrival time
          if (context.currentTrip) {
            const now = new Date();
            const avgSpeed = 60; // km/h average in city
            const remainingDistance = context.currentTrip.estimatedDistance || 0;
            const hoursRemaining = remainingDistance / avgSpeed;
            const eta = new Date(now.getTime() + hoursRemaining * 60 * 60 * 1000);
            context.estimatedArrival = eta;
            context.nextDeliveryETA = `${Math.floor(hoursRemaining)}h${Math.round((hoursRemaining % 1) * 60)}min`;

            // Set delivery counts from trip statistics
            context.pendingDeliveries = (context.currentTrip.deliveryCount || 0) - (context.currentTrip.completedDeliveries || 0);
            context.completedDeliveries = context.currentTrip.completedDeliveries || 0;
          }
        }
      } catch (e) {
        console.log('⚠️ Could not fetch trips:', e);
      }

      // ✅ FIX 2b: Fetch notifications with correct data extraction
      try {
        const notifResponse = await firstValueFrom(
          this.http.get<any>(`${baseUrl}/api/Notifications?pageIndex=0&pageSize=20`, { headers })
        );

        // Response structure: { data: { notifications: [...], unreadCount: N, totalCount: N } }
        if (notifResponse?.data?.notifications) {
          context.notifications = Array.isArray(notifResponse.data.notifications) ? notifResponse.data.notifications : [];
          context.unreadNotifications = notifResponse.data.unreadCount || 0;
        } else if (notifResponse?.data && Array.isArray(notifResponse.data)) {
          // Fallback: if data is directly an array
          context.notifications = notifResponse.data;
          context.unreadNotifications = context.notifications.filter((n: any) => !n.isRead).length;
        }
      } catch (e) {
        console.log('⚠️ Could not fetch notifications:', e);
      }

      // Fetch driver info
      try {
        const userResponse = await firstValueFrom(
          this.http.get<any>(`${baseUrl}/api/User/profile`, { headers })
        );
        if (userResponse?.data) {
          const profile = userResponse.data;
          context.driverName = profile.name || profile.firstName || profile.userName || '';
          context.driverZone = profile.zone || profile.city || '';
          context.driverCity = profile.city || '';
          context.truckInfo = profile.truck || profile.vehicle || null;
        }
      } catch (e) {
        console.log('⚠️ Could not fetch user profile:', e);
      }

      // ✅ FIX 2c: Fetch other drivers using correct endpoint (api/Drivers - plural)
      try {
        const driversResponse = await firstValueFrom(
          this.http.get<any>(`${baseUrl}/api/Drivers`, { headers })
        );
        if (driversResponse?.data) {
          const allDrivers = Array.isArray(driversResponse.data) ? driversResponse.data : [];
          context.otherDrivers = allDrivers.filter((d: any) => d.id !== driverId);

          // Find drivers in same zone/city
          if (context.driverCity || context.driverZone) {
            context.driversInSameZone = allDrivers.filter((d: any) =>
              (d.city && d.city === context.driverCity) ||
              (d.zone && d.zone === context.driverZone)
            );
          }
        }
      } catch (e) {
        console.log('⚠️ Could not fetch other drivers:', e);
      }

      // Try to fetch weather if we have a location
      if (context.driverCity || context.currentTrip?.destinationAddress) {
        const location = context.currentTrip?.destinationAddress || context.driverCity;
        if (location) {
          context.weatherInfo = await this.getWeatherInfo(location);
        }
      }

    } catch (error) {
      console.error('Error fetching context:', error);
    }

    return context;
  }

  private buildEnhancedSystemPrompt(context: any): string {
    let systemPrompt = `Tu es un assistant IA professionnel et intelligent pour TMS (Transport Management System).

Tu es l'assistant personnel d'un chauffeur-livreur. Tu dois répondre à TOUTES les questions de manière intelligente, naturelle et contextuelle.

INSTRUCTIONS STRICTES:
1. Réponds TOUJOURS en français
2. Sois naturel, amical, professionnel et concis
3. Utilise des emojis pertinents
4. Utilise les données réelles ci-dessous pour répondre précisément
5. Si tu n'as pas l'information, dis-le honnêtement et suggère une alternative
6. Pour la météo et le traffic, donne des conseils pratiques au chauffeur
7. Pour les questions sur les autres chauffeurs, base-toi sur les données réelles

DONNÉES EN TEMPS RÉEL DU CHAUFFEUR:
`;

    if (context.driverName) {
      systemPrompt += `👤 Chauffeur: ${context.driverName}\n`;
    }
    if (context.driverCity) {
      systemPrompt += `📍 Ville actuelle: ${context.driverCity}\n`;
    }
    if (context.driverZone) {
      systemPrompt += `🗺️ Zone: ${context.driverZone}\n`;
    }
    if (context.truckInfo) {
      systemPrompt += `🚛 Véhicule: ${context.truckInfo.immatriculation || JSON.stringify(context.truckInfo)}\n`;
    }

    if (context.currentTrip) {
      systemPrompt += `
🚗 TRAJET ACTUEL:
- Référence: ${context.currentTrip.tripReference || 'N/A'}
- Statut: ${this.getStatusLabel(context.currentTrip.status)}
- Distance totale: ${context.currentTrip.estimatedDistance || 0} km
- Durée estimée: ${context.currentTrip.estimatedDuration || 0}h
- Destination: ${context.currentTrip.destinationAddress || 'Non définie'}
- ETA prochaine livraison: ${context.nextDeliveryETA || 'Non calculé'}
`;
      if (context.deliveries?.length > 0) {
        const pending = context.deliveries.filter((d: any) =>
          d.status === 'Pending' || d.status === 'Assigned'
        );
        const completed = context.deliveries.filter((d: any) =>
          d.status === 'Delivered' || d.status === 'Completed'
        );
        systemPrompt += `
📦 LIVRAISONS:
- Total: ${context.deliveries.length}
- En attente: ${pending.length}
- Terminées: ${completed.length}
`;
        if (pending.length > 0) {
          const next = pending[0];
          systemPrompt += `- Prochaine livraison: ${next.deliveryAddress || 'N/A'}`;
          if (next.customerName) systemPrompt += ` (Client: ${next.customerName})`;
          systemPrompt += `\n`;
        }
      }
    } else {
      systemPrompt += `🚗 Aucun trajet actif en ce moment\n`;
    }

    if (context.unreadNotifications > 0) {
      systemPrompt += `🔔 ${context.unreadNotifications} notification(s) non lue(s)\n`;
      const recentNotifs = context.notifications?.filter((n: any) => !n.isRead).slice(0, 3);
      if (recentNotifs?.length > 0) {
        systemPrompt += `Détails des notifications:\n`;
        recentNotifs.forEach((n: any) => {
          systemPrompt += `  • ${n.title || 'Notification'}: ${n.message || ''}\n`;
        });
      }
    } else {
      systemPrompt += `🔔 Aucune notification non lue\n`;
    }

    if (context.driversInSameZone?.length > 0) {
      systemPrompt += `
👥 CHAUFFEURS DANS LA MÊME ZONE (${context.driverCity || context.driverZone}):
`;
      context.driversInSameZone.slice(0, 5).forEach((d: any) => {
        systemPrompt += `- ${d.name || d.userName || 'Chauffeur'} (${d.status || 'Statut inconnu'})\n`;
      });
    }

    if (context.weatherInfo) {
      systemPrompt += `
🌤️ MÉTÉO ACTUELLE:
- Température: ${context.weatherInfo.temperature}°C
- Conditions: ${context.weatherInfo.description}
- Humidité: ${context.weatherInfo.humidity}%
- Vent: ${context.weatherInfo.windSpeed} km/h
`;
    }

    systemPrompt += `
CONSEILS À DONNER SELON LE CONTEXTE:
- Si mauvaise météo: suggère de reporter ou faire attention
- Si traffic: suggère itinéraires alternatifs
- Si beaucoup de livraisons: encourage et donne des tips d'organisation
- Si peu de chauffeurs en zone: mentionne la disponibilité
- Toujours être utile, positif et pratique

RÉPONDRE DE MANIÈRE INTELLIGENTE ET CONTEXTUELLE.`;

    return systemPrompt;
  }

  private getStatusLabel(status: string): string {
    // ✅ FIX 2d: Match backend TripStatus enum values
    const labels: any = {
      'Pending': 'En attente',
      'Assigned': 'Assigné',
      'Accepted': 'Accepté',
      'Loading': 'Chargement',
      'InDelivery': 'En livraison',
      'Arrived': 'Arrivé',
      'Completed': 'Terminé',
      'Cancelled': 'Annulé',
      'Refused': 'Refusé',
      // Deprecated aliases
      'Planned': 'En attente',
      'LoadingInProgress': 'Chargement',
      'DeliveryInProgress': 'En livraison',
      'Receipt': 'Arrivé'
    };
    return labels[status] || status;
  }

  /**
   * Get weather info from OpenWeatherMap API or fallback
   */
  private async getWeatherInfo(location: string): Promise<any> {
    // Check cache first
    const cacheKey = location.toLowerCase().trim();
    if (this.weatherCache.has(cacheKey)) {
      return this.weatherCache.get(cacheKey);
    }

    try {
      // Try to use OpenWeatherMap API if key is available
      const weatherApiKey = environment.weatherApiKey || '';
      if (weatherApiKey && weatherApiKey !== 'YOUR_API_KEY') {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${weatherApiKey}&units=metric&lang=fr`;
        const response = await firstValueFrom(
          this.http.get<any>(url).pipe(
            catchError(() => {
              console.warn('Weather API error, using fallback');
              return [];
            })
          )
        );

        if (response && response.main && response.weather) {
          const weather = {
            temperature: Math.round(response.main.temp),
            description: response.weather[0].description,
            humidity: response.main.humidity,
            windSpeed: Math.round(response.wind?.speed * 3.6 || 0), // m/s to km/h
            icon: response.weather[0].icon
          };
          this.weatherCache.set(cacheKey, weather);
          return weather;
        }
      }
    } catch (e) {
      console.log('Weather API not available, using simulated data');
    }

    // Fallback: simulated weather based on time of year
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();

    // Simple seasonal weather simulation
    let baseTemp = 15; // Spring/Fall default
    if (month >= 5 && month <= 7) baseTemp = 25; // Summer
    else if (month >= 11 || month <= 1) baseTemp = 5; // Winter

    const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 5;
    const temperature = Math.round(baseTemp + tempVariation);

    const conditions = [
      { description: 'Ciel dégagé', icon: '01d' },
      { description: 'Peu nuageux', icon: '02d' },
      { description: 'Partiellement nuageux', icon: '03d' },
      { description: 'Nuageux', icon: '04d' }
    ];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    const weather = {
      temperature,
      description: condition.description,
      humidity: Math.round(50 + Math.random() * 30),
      windSpeed: Math.round(5 + Math.random() * 20),
      icon: condition.icon,
      simulated: true
    };

    this.weatherCache.set(cacheKey, weather);
    return weather;
  }

  private async getIntelligentFallback(message: string, driverId: number): Promise<ChatResponse> {
    const lowerMsg = message.toLowerCase().trim();

    // Fetch context silently
    let context;
    try {
      context = await this.fetchDataContext(driverId);
    } catch (e) {
      context = { deliveries: [], currentTrip: null, notifications: [], unreadNotifications: 0, driversInSameZone: [], weatherInfo: null };
    }

    // ===== TRAFFIC =====
    if (this.isTrafficQuestion(lowerMsg)) {
      if (context.currentTrip) {
        const hour = new Date().getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        const distance = context.currentTrip.estimatedDistance || 0;

        let trafficAdvice = `🚦 **Trafic actuel:**\n\n`;
        if (isRushHour) {
          trafficAdvice += `⚠️ **Heure de pointe détectée** (${hour}h)\n\n`;
          trafficAdvice += `• Temps de trajet estimé: +30-50%\n`;
          trafficAdvice += `• Distance: ${distance} km\n`;
          if (context.nextDeliveryETA) {
            trafficAdvice += `• ETA actuelle: ~${context.nextDeliveryETA}\n`;
          }
          trafficAdvice += `\n💡 **Conseils:**\n`;
          trafficAdvice += `• Privilégiez les axes secondaires\n`;
          trafficAdvice += `• Gardez vos distances de sécurité\n`;
          trafficAdvice += `• Prévenez le client en cas de retard`;
        } else {
          trafficAdvice += `✅ **Trafic fluide**\n\n`;
          trafficAdvice += `• Distance: ${distance} km\n`;
          if (context.nextDeliveryETA) {
            trafficAdvice += `• ETA estimée: ~${context.nextDeliveryETA}\n`;
          }
          trafficAdvice += `\n💡 Bonne route ! 🚛`;
        }

        return { message: trafficAdvice, source: 'intelligent-fallback', isConfident: true };
      } else {
        return {
          message: `🚦 **Trafic:**\n\nVous n'avez pas de trajet actif.\n\n💡 Consultez votre app GPS pour voir le trafic en temps réel.`,
          source: 'intelligent-fallback', isConfident: true
        };
      }
    }

    // ===== DRIVERS IN SAME ZONE =====
    if (this.isDriverZoneQuestion(lowerMsg)) {
      if (context.driversInSameZone?.length > 0) {
        let response = `👥 **Chauffeurs en ${context.driverCity || context.driverZone}:**\n\n`;
        context.driversInSameZone.slice(0, 5).forEach((d: any, i: number) => {
          const status = d.status === 'InProgress' || d.status === 'InDelivery' ? '🟢 En livraison' :
                        d.status === 'Available' ? '🟡 Disponible' : '⚫ Hors ligne';
          response += `${i + 1}. ${d.name || d.userName || 'Chauffeur'} - ${status}\n`;
        });
        response += `\n📊 Total: ${context.driversInSameZone.length} chauffeur(s) dans votre zone`;
        return { message: response, source: 'intelligent-fallback', isConfident: true };
      } else {
        return {
          message: `👥 **Chauffeurs en zone:**\n\nAucun autre chauffeur dans votre zone actuellement.\n\n💡 Vous êtes seul sur ce secteur pour le moment.`,
          source: 'intelligent-fallback', isConfident: true
        };
      }
    }

    // ===== DISTANCE / ETA =====
    if (this.isDistanceOrETAQuestion(lowerMsg)) {
      if (context.currentTrip) {
        let response = `📏 **Distance & ETA:**\n\n`;
        response += `🚛 Distance totale: ${context.currentTrip.estimatedDistance || 0} km\n`;
        response += `⏱️ Durée estimée: ${context.currentTrip.estimatedDuration || 0}h\n`;
        if (context.nextDeliveryETA) {
          response += `📍 Prochaine livraison: ~${context.nextDeliveryETA}\n`;
        }
        if (context.estimatedArrival) {
          const eta = new Date(context.estimatedArrival);
          response += `🕐 Arrivée estimée: ${eta.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n`;
        }
        response += `\n💡 Utilisez le GPS pour un suivi en temps réel !`;
        return { message: response, source: 'intelligent-fallback', isConfident: true };
      } else {
        return {
          message: `📏 **Distance:**\n\nAucun trajet actif pour calculer la distance.\n\n💡 Consultez "Mes Trajets" pour voir vos missions.`,
          source: 'intelligent-fallback', isConfident: true
        };
      }
    }

    // ===== ADVICE / TIPS =====
    if (this.isAdviceQuestion(lowerMsg)) {
      const tips = [
        `💡 **Conseil du jour:**\n\n🚛 **Conduite économique:**\n• Anticipez les feux rouges\n• Maintenez une vitesse constante\n• Vérifiez la pression des pneus\n\n📦 **Livraisons efficaces:**\n• Préparez vos colis à l'avance\n• Confirmez chaque livraison\n• Communiquez avec les clients\n\n💪 Bonne route !`,
        `💡 **Conseil du jour:**\n\n⏰ **Gestion du temps:**\n• Planifiez vos pauses\n• Priorisez les livraisons urgentes\n• Évitez les heures de pointe si possible\n\n📱 **Utilisez l'app:**\n• GPS pour la navigation\n• Chat pour contacter les collègues\n• Notifications pour les mises à jour\n\n🚛 Bonne route !`,
        `💡 **Conseil du jour:**\n\n🛡️ **Sécurité:**\n• Portez toujours votre ceinture\n• Faites des pauses toutes les 2h\n• Restez hydraté\n\n📦 **Qualité de service:**\n• Soyez ponctuel\n• Soyez courtois avec les clients\n• Signalez tout problème immédiatement\n\n✅ Excellent travail !`
      ];
      const tipIndex = new Date().getDay() % tips.length;
      return { message: tips[tipIndex], source: 'intelligent-fallback', isConfident: true };
    }

    // ===== HELP =====
    if (this.isHelpQuestion(lowerMsg)) {
      return {
        message: `🆘 **Aide - Ce que je peux faire:**\n\n` +
                 `📦 **Livraisons:** "Combien de livraisons?"\n` +
                 `📍 **Destination:** "Où est ma prochaine livraison?"\n` +
                 `🗺️ **Trajet:** "Statut de mon trajet?"\n` +
                 `🔔 **Notifications:** "Messages non lus?"\n` +
                 `🚦 **Trafic:** "Comment est le trafic?"\n` +
                 `🌤️ **Météo:** "Quel temps fait-il?"\n` +
                 `👥 **Chauffeurs:** "Qui est dans ma zone?"\n` +
                 `📏 **Distance:** "Combien de km?"\n` +
                 `🕐 **Heure:** "Quelle heure est-il?"\n` +
                 `💡 **Conseils:** "Donne-moi un conseil"\n\n` +
                 `💬 Posez-moi une question !`,
        source: 'intelligent-fallback', isConfident: true
      };
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
          if (next.customerName) response += `\n👤 **Client:** ${next.customerName}`;
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
        let response = `🗺️ **Votre trajet:**\n\n`;
        response += `📋 Réf: ${context.currentTrip.tripReference}\n`;
        response += `📊 Statut: ${this.getStatusLabel(context.currentTrip.status)}\n`;
        response += `📦 Livraisons: ${context.deliveries?.length || 0}\n`;
        if (context.currentTrip.estimatedDistance) {
          response += `📏 Distance: ${context.currentTrip.estimatedDistance} km\n`;
        }
        if (context.nextDeliveryETA) {
          response += `⏱️ ETA: ~${context.nextDeliveryETA}\n`;
        }
        response += `\n📱 Utilisez le GPS pour naviguer.`;
        return { message: response, source: 'intelligent-fallback', isConfident: true };
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
          if (unread.length > 3) {
            response += `\n   ...et ${unread.length - 3} autre(s)`;
          }
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
      if (context.weatherInfo) {
        const w = context.weatherInfo;
        let response = `🌤️ **Météo actuelle**${context.simulated ? ' (estimée)' : ''}:\n\n`;
        response += `🌡️ Température: ${w.temperature}°C\n`;
        response += `☁️ Conditions: ${w.description}\n`;
        response += `💧 Humidité: ${w.humidity}%\n`;
        response += `💨 Vent: ${w.windSpeed} km/h\n`;

        // Add driving advice based on weather
        if (w.temperature < 5) {
          response += `\n⚠️ **Attention:** Risque de verglas, conduisez prudemment !`;
        } else if (w.temperature > 30) {
          response += `\n💧 **Conseil:** Forte chaleur, pensez à vous hydrater !`;
        } else if (w.humidity > 80) {
          response += `\n🌧️ **Attention:** Risque de pluie, réduisez votre vitesse !`;
        } else if (w.windSpeed > 50) {
          response += `\n💨 **Attention:** Vent fort, soyez vigilant !`;
        } else {
          response += `\n✅ Météo favorable pour la conduite ! 🚛`;
        }

        return { message: response, source: 'intelligent-fallback', isConfident: true };
      } else {
        return {
          message: `🌤️ **Météo**\n\nJe n'ai pas accès aux données météo en temps réel.\n\n💡 Consultez votre app météo ou Météo France avant de partir.`,
          source: 'intelligent-fallback', isConfident: true
        };
      }
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
      if (context.currentTrip) {
        greeting += `\n\n🚛 Trajet actif: ${context.currentTrip.tripReference}`;
        greeting += `\n📦 ${context.pendingDeliveries} livraison(s) en attente`;
      }
      greeting += '\n\nComment puis-je vous aider? 😊';
      return { message: greeting, source: 'intelligent-fallback', isConfident: true };
    }

    // ===== STATUS UPDATE =====
    if (this.isStatusQuestion(lowerMsg)) {
      if (context.currentTrip) {
        return {
          message: `📊 **Statut actuel:**\n\n` +
                   `🚛 Trajet: ${context.currentTrip.tripReference}\n` +
                   `📍 Statut: ${this.getStatusLabel(context.currentTrip.status)}\n` +
                   `📦 Livraisons: ${context.pendingDeliveries} restantes\n` +
                   `${context.nextDeliveryETA ? `⏱️ ETA: ${context.nextDeliveryETA}\n` : ''}` +
                   `\n💪 Continuez comme ça !`,
          source: 'intelligent-fallback', isConfident: true
        };
      } else {
        return {
          message: `📊 **Statut:**\n\nAucun trajet actif.\n\n💡 Vous êtes disponible pour de nouvelles missions !`,
          source: 'intelligent-fallback', isConfident: true
        };
      }
    }

    // ===== DEFAULT =====
    return {
      message: `🤖 **Assistant IA TMS**\n\n` +
               `Je peux vous aider avec:\n\n` +
               `📦 Livraisons & colis\n` +
               `🗺️ Trajets & navigation\n` +
               `📍 Destinations & adresses\n` +
               `🔔 Notifications & messages\n` +
               `🚦 Trafic & itinéraires\n` +
               `🌤️ Météo & conditions\n` +
               `👥 Chauffeurs & zones\n` +
               `📏 Distances & ETA\n` +
               `🕐 Heure & date\n` +
               `💡 Conseils de conduite\n\n` +
               `💬 Tapez "aide" pour voir toutes les options !`,
      source: 'intelligent-fallback', isConfident: false
    };
  }

  // ===== PATTERN MATCHING =====
  private isDestinationQuestion(msg: string): boolean {
    return ['destination', 'où', 'ou', 'adresse', 'endroit', 'lieu', 'arriver', 'arrive', 'prochaine livraison'].some(k => msg.includes(k));
  }
  private isWeatherQuestion(msg: string): boolean {
    return ['météo', 'meteo', 'temps', 'weather', 'pleut', 'soleil', 'nuage', 'vent', 'température', 'fait-il', 'fait il'].some(k => msg.includes(k));
  }
  private isTimeQuestion(msg: string): boolean {
    return ['heure', 'date', 'jour', 'time'].some(k => msg.includes(k));
  }
  private isDeliveryQuestion(msg: string): boolean {
    return ['livraison', 'delivery', 'combien', 'colis', 'package', 'livrer'].some(k => msg.includes(k));
  }
  private isTripQuestion(msg: string): boolean {
    return ['trajet', 'route', 'itinéraire', 'mission', 'tournee', 'voyage'].some(k => msg.includes(k));
  }
  private isNotificationQuestion(msg: string): boolean {
    return ['notification', 'alerte', 'message', 'notif', 'nouveau', 'non lu'].some(k => msg.includes(k));
  }
  private isGreeting(msg: string): boolean {
    return ['bonjour', 'salut', 'hello', 'coucou', 'hey', 'bonsoir', 'ça va', 'ca va', 'bonjour'].some(k => msg.includes(k));
  }
  private isTrafficQuestion(msg: string): boolean {
    return ['trafic', 'traffic', 'circulation', 'bouchon', 'embouteillage', 'route', 'axe', 'heure de pointe'].some(k => msg.includes(k));
  }
  private isDriverZoneQuestion(msg: string): boolean {
    return ['chauffeur', 'conducteur', 'zone', 'même ville', 'meme ville', 'même zone', 'meme zone', 'collègue', 'collegue', 'qui est'].some(k => msg.includes(k));
  }
  private isDistanceOrETAQuestion(msg: string): boolean {
    return ['distance', 'km', 'kilomètre', 'combien de temps', 'eta', 'arrivée', 'arrivee', 'durée', 'duree', 'temps restant'].some(k => msg.includes(k));
  }
  private isAdviceQuestion(msg: string): boolean {
    return ['conseil', 'tip', 'astuce', 'recommandation', 'suggestion', 'aide-moi', 'aide moi'].some(k => msg.includes(k));
  }
  private isHelpQuestion(msg: string): boolean {
    return ['aide', 'help', 'quoi faire', 'comment', 'peux-tu', 'peux tu', 'capacités', 'capacites'].some(k => msg.includes(k));
  }
  private isStatusQuestion(msg: string): boolean {
    return ['statut', 'status', 'état', 'etat', 'où en suis', 'ou en suis', 'point', 'bilan'].some(k => msg.includes(k));
  }

  async getSuggestions(): Promise<string[]> {
    return [
      '📦 Combien de livraisons restantes?',
      '📍 Où est ma prochaine livraison?',
      '🗺️ Statut de mon trajet actuel?',
      '🔔 Notifications non lues?',
      '🚦 Comment est le trafic?',
      '🌤️ Quel temps fait-il?',
      '👥 Qui est dans ma zone?',
      '🕐 Quelle heure est-il?',
      '💡 Donne-moi un conseil'
    ];
  }
}