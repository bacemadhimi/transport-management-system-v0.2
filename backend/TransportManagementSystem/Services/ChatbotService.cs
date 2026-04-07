using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Entity; // For DeliveryStatus enum

namespace TransportManagementSystem.Services;

public interface IChatbotService
{
    Task<ChatResponse> GetResponseAsync(ChatRequest request);
    Task<List<KnowledgeBase>> GetContextAsync(int driverId, string query);
}

public class ChatbotService : IChatbotService
{
    private readonly ApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ChatbotService> _logger;
    private readonly string _ollamaEndpoint;
    private readonly string _llmModel;

    // ✅ RAG Knowledge Base - Comprehensive project knowledge
    private static readonly List<KnowledgeEntry> _knowledgeBase = new()
    {
        new KnowledgeEntry
        {
            Category = "app",
            Keywords = new[] { "application", "app", "mobile", "fonctionnalité", "fonctionnalite", "interface", "utiliser" },
            Title = "Application Mobile TMS",
            Content = @"L'application TMS Mobile est une application Ionic/Angular pour les chauffeurs.
Fonctionnalités principales :
- 📋 Mes Trajets : Liste des missions assignées, acceptation/rejet, suivi en temps réel
- 🗺️ GPS Tracking : Navigation GPS avec itinéraire optimisé, position temps réel, voice navigation
- 🔔 Notifications : Alertes en temps réel des nouvelles missions, changements de statut
- 💬 Chat : Discussion entre chauffeurs via SignalR
- 🤖 Assistant IA : Chatbot intelligent avec contexte temps réel
- 📊 Profil : Informations du chauffeur, historique
Statuts des voyages : Pending → Assigned → Accepted → Loading → InDelivery → Arrived → Completed
L'application utilise SignalR pour le temps réel, Leaflet pour les cartes, et Ollama pour l'IA."
        },
        new KnowledgeEntry
        {
            Category = "workflow",
            Keywords = new[] { "trajet", "voyage", "mission", "statut", "étape", "etape", "workflow", "processus" },
            Title = "Workflow des Voyages",
            Content = @"Cycle de vie complet d'un voyage TMS :
1. 📋 Planned/Assigned : L'admin crée et assigne le voyage au chauffeur
2. ✅ Accepted : Le chauffeur accepte la mission via l'app mobile
3. 📦 Loading : Chargement du camion au point de départ
4. 🚚 InDelivery : Livraison en cours - le chauffeur suit l'itinéraire GPS
5. 📍 Arrived : Arrivée à destination
6. ✅ Completed : Voyage terminé - QR code scanné ou confirmation manuelle
Statuts alternatifs : Refused (refusé), Cancelled (annulé)
Le suivi GPS est automatique toutes les 5 secondes via SignalR."
        },
        new KnowledgeEntry
        {
            Category = "gps",
            Keywords = new[] { "gps", "position", "localisation", "navigation", "itinéraire", "carte", "route" },
            Title = "Suivi GPS et Navigation",
            Content = @"Le suivi GPS fonctionne ainsi :
- 📍 Position capturée via watchPosition() avec enableHighAccuracy=true
- 🔄 Envoyée au backend via SignalR (SendPosition) toutes les 5 secondes
- 🗺️ Affichée en temps réel sur la carte Leaflet avec icône camion SVG
- 🛣️ Itinéraire calculé via OSRM (Open Source Routing Machine)
- 🎙️ Voice navigation disponible avec instructions vocales en français
- 📊 L'admin voit tous les camions sur http://localhost:4200/gps-tracking
- 🎯 Les coordonnées sont EXACTES entre mobile et web (pas de recalcul)
Le truck icon est un SVG professionnel 3D blanc/gris avec phares clignotants."
        },
        new KnowledgeEntry
        {
            Category = "accept",
            Keywords = new[] { "accepter", "acceptation", "refuser", "refus", "mission", "assigné", "nouveau" },
            Title = "Accepter/Refuser une Mission",
            Content = @"Quand un voyage est assigné :
1. 🔔 Notification push reçue sur le mobile (son + badge)
2. 📋 Le voyage apparaît dans 'Mes Trajets' avec détails complets
3. ✅ Pour accepter : Bouton 'Accepter la Mission' → SignalR AcceptTrip()
4. ❌ Pour refuser : Bouton 'Refuser' avec motif (Météo, Indisponible, Médical, etc.)
5. 📊 L'admin voit l'acceptation/rejet en temps réel sur le web
Après acceptation : Commencer le chargement → Commencer la livraison → Terminer
Un trajet refusé retourne à l'admin pour réassignation."
        },
        new KnowledgeEntry
        {
            Category = "loading",
            Keywords = new[] { "chargement", "charger", "quai", "loading", "commencer" },
            Title = "Procédure de Chargement",
            Content = @"Pour commencer le chargement :
1. 📋 Ouvrir le détail du trajet accepté
2. 📦 Cliquer sur 'Commencer le Chargement'
3. ⏰ Confirmer l'heure de début
4. ✅ Le statut passe à 'Loading'
5. 🚛 Se positionner au quai de chargement
Points importants :
- Vérifier l'arrimage des marchandises
- Contrôler le poids chargé vs capacité du camion
- Signaler tout problème immédiatement au support
- Le chargement doit être complété avant de commencer la livraison"
        },
        new KnowledgeEntry
        {
            Category = "delivery",
            Keywords = new[] { "livraison", "livrer", "client", "destination", "qr", "scanner" },
            Title = "Procédure de Livraison",
            Content = @"Pour effectuer une livraison :
1. 🚚 Cliquer sur 'Commencer la Livraison' après chargement
2. 🗺️ Suivre l'itinéraire GPS jusqu'à la destination
3. 📍 Arrivé : Cliquer sur 'Arrivé à destination'
4. 📱 Scanner le QR code du client (ou saisie manuelle)
5. ✅ Confirmer la livraison terminée
6. 🏁 Répéter pour chaque point de livraison du trajet
Le QR code contient les infos du client et de la commande.
En cas de problème : contacter le support + signaler dans l'app."
        },
        new KnowledgeEntry
        {
            Category = "emergency",
            Keywords = new[] { "urgence", "problème", "panne", "accident", "casse", "aide", "emergency" },
            Title = "Gestion des Urgences",
            Content = @"En cas d'urgence (panne, accident, retard) :
1. 🛑 SÉCURITÉ D'ABORD :
   - Mettez les warnings
   - Placez le triangle de signalisation
   - Enfilez le gilet fluorescent
2. 📞 Contactez le support :
   - Téléphone : +216 XX XXX XXX
   - Via l'app : Signaler un problème
3. 📸 Prenez des photos (accident, panne, marchandises)
4. 📝 Notez les détails dans l'application
5. 🚑 Si accident : appelez aussi les secours (190 police, 193 pompiers)
L'application géolocalise automatiquement votre position en cas de signalement."
        },
        new KnowledgeEntry
        {
            Category = "fuel",
            Keywords = new[] { "carburant", "plein", "essence", "gasoil", "station", "fuel" },
            Title = "Gestion du Carburant",
            Content = @"Pour la gestion du carburant :
⛽ Stations partenaires TMS :
- Liste disponible dans l'app (section 'Stations')
- Prix négociés préférentiels
- Conserver TOUS les reçus pour remboursement
📝 Procédure :
1. Faire le plein dans une station partenaire
2. Prendre photo du reçu
3. Enregistrer dans l'app : quantité, montant, station
4. Joindre photo du reçu
⚠️ Ne PAS dépasser la capacité du réservoir
📊 Le suivi carburant est visible par l'admin"
        },
        new KnowledgeEntry
        {
            Category = "breaks",
            Keywords = new[] { "pause", "repos", "déjeuner", "manger", "dormir", "sieste" },
            Title = "Pauses et Repos",
            Content = @"Réglementation des pauses pour chauffeurs :
⏱️ Pauses obligatoires :
- Toutes les 2 heures de conduite : 15 min minimum
- Pause déjeuner : 30-60 min recommandée
🅿️ Où se garer :
- Aires de repos autorisées UNIQUEMENT
- Jamais sur les bas-côtés d'autoroute
- Zones de stationnement poids lourds
📱 Dans l'app :
- Signalez vos pauses dans l'application
- Le temps de pause n'est pas compté dans le temps de livraison
🛌 Repos nocturne :
- Maximum 9h de conduite par jour
- Repos minimum 11h entre deux journées
⚠️ La sécurité avant tout !"
        },
        new KnowledgeEntry
        {
            Category = "notifications",
            Keywords = new[] { "notification", "alerte", "message", "badge", "son" },
            Title = "Système de Notifications",
            Content = @"Les notifications TMS :
🔔 Types de notifications :
- NEW_TRIP_ASSIGNMENT : Nouveau voyage assigné
- TRIP_ACCEPTED : Voyage accepté par le chauffeur
- TRIP_REJECTED : Voyage refusé
- LOADING_STARTED : Chargement démarré
- DELIVERY_STARTED : Livraison démarrée
- ARRIVED_AT_DESTINATION : Arrivé à destination
- MISSION_COMPLETED : Mission terminée
📱 Fonctionnalités :
- Push notification native (si permission accordée)
- Son de notification
- Badge sur l'icône de l'app
- Persistance locale (SQLite/LocalStorage)
- Synchronisation avec le serveur
💬 Les notifications sont en temps réel via SignalR"
        },
        new KnowledgeEntry
        {
            Category = "profile",
            Keywords = new[] { "profil", "profile", "info", "information", "personnel", "chauffeur" },
            Title = "Profil Chauffeur",
            Content = @"Votre profil chauffeur contient :
👤 Informations personnelles :
- Nom complet
- Numéro de téléphone
- Email
- Numéro de permis
📊 Statistiques :
- Nombre de missions effectuées
- Taux d'acceptation
- Heures de conduite
- Kilométrage total
⚙️ Paramètres :
- Notifications activées/désactivées
- Mode sombre/clair
- Langue (français par défaut)
- Mode vocal activé/désactivé
📱 Pour accéder au profil : Menu → Profil"
        },
        new KnowledgeEntry
        {
            Category = "support",
            Keywords = new[] { "support", "contact", "aide", "aider", "téléphone", "email", "joindre" },
            Title = "Contacter le Support",
            Content = @"Contacts du support TMS :
📞 Téléphone : +216 XX XXX XXX
📧 Email : support@tms.com
💬 Via l'application :
- Menu → Aide → Contacter le support
- Ou section 'Signaler un problème'
🕐 Horaires du support :
- Lundi à Vendredi : 8h00 - 18h00
- Samedi : 8h00 - 12h00
- Dimanche : Fermé (urgences uniquement)
🚨 En cas d'urgence hors horaires :
- Appelez le numéro d'urgence
- Utilisez la fonction 'Signaler un problème' dans l'app
- L'équipe vous rappellera dès que possible"
        },
        new KnowledgeEntry
        {
            Category = "web_admin",
            Keywords = new[] { "admin", "administrateur", "web", "suivi", "carte web", "gps web" },
            Title = "Interface Web Admin",
            Content = @"L'interface web admin (http://localhost:4200) permet :
📊 Tableau de bord :
- Vue d'ensemble de tous les voyages
- Statistiques en temps réel
- Alertes et notifications
🗺️ Suivi GPS (http://localhost:4200/gps-tracking) :
- Carte avec tous les camions en temps réel
- Position EXACTE comme le mobile (SignalR)
- Itinéraires vers destinations
- Filtres par statut
📋 Gestion des voyages :
- Création de voyages
- Assignation aux chauffeurs
- Modification/Suppression
- Suivi des statuts
👥 Gestion des employés :
- Chauffeurs, Camions, Clients
- Disponibilité et planning
Le web et le mobile sont parfaitement synchronisés via SignalR."
        },
        new KnowledgeEntry
        {
            Category = "greetings",
            Keywords = new[] { "bonjour", "salut", "hello", "coucou", "bonsoir", "salam" },
            Title = "Salutations",
            Content = @"Réponses aux salutations :
Bonjour ! 👋 Je suis votre assistant IA TMS.

Je peux vous aider avec :
• 📋 Vos trajets et missions
• 📦 Vos livraisons
• 🗺️ Navigation GPS
• ⚠️ Urgences et problèmes
• ⛽ Carburant et pauses
• 📞 Contacter le support

Posez-moi une question précise !"
        },
        new KnowledgeEntry
        {
            Category = "thanks",
            Keywords = new[] { "merci", "thanks", "super", "parfait", "genial" },
            Title = "Remerciements",
            Content = @"Je vous en prie ! 😊

N'hésitez pas si vous avez d'autres questions.
Bonne route et conduisez prudemment ! 🚛💨

Rappel : La sécurité avant tout !"
        },
    };

    public ChatbotService(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<ChatbotService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
        _ollamaEndpoint = configuration["AI:OllamaEndpoint"] ?? "http://localhost:11434";
        _llmModel = configuration["AI:LLMModel"] ?? "llama3.1";
    }

    public async Task<ChatResponse> GetResponseAsync(ChatRequest request)
    {
        try
        {
            _logger.LogInformation($"🤖 Chatbot request from driver {request.DriverId}: {request.Message}");

            // Step 1: Get driver's current trip info (REAL-TIME data)
            var driverInfo = await GetDriverInfoAsync(request.DriverId);

            _logger.LogInformation($"👤 Driver info: Id={driverInfo.DriverId}, Name={driverInfo.DriverName}, Status={driverInfo.Status}");

            // Step 2: Retrieve relevant RAG context
            var ragContext = await GetContextAsync(request.DriverId, request.Message);

            _logger.LogInformation($"📚 RAG context items: {ragContext.Count}");

            // Step 3: Try to use Ollama LLM with RAG, fallback to rule-based if not available
            string response;
            try
            {
                response = await CallLLMWithRAGAsync(request.Message, driverInfo, ragContext);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Ollama not available, using RAG-based fallback");
                response = GenerateIntelligentResponseWithRAG(request.Message, driverInfo, ragContext);
            }

            _logger.LogInformation($"🤖 Chatbot response: {response.Substring(0, Math.Min(100, response.Length))}");

            return new ChatResponse
            {
                Message = response,
                Source = response.Contains("📍") || response.Contains("🚛") ? "Database" : "AI",
                IsConfident = !string.IsNullOrEmpty(response) && response.Length > 10,
                Context = new Dictionary<string, object>
                {
                    { "tripReference", driverInfo.TripReference ?? "Aucun" },
                    { "status", driverInfo.Status ?? "En attente" },
                    { "deliveriesCount", driverInfo.DeliveriesCount },
                    { "driverName", driverInfo.DriverName ?? "Chauffeur" },
                    { "driverId", driverInfo.DriverId },
                    { "ragContextItems", ragContext.Count }
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Chatbot error");
            return new ChatResponse
            {
                Message = "Je suis désolé, je rencontre un problème technique. Veuillez réessayer dans quelques instants.",
                IsConfident = false
            };
        }
    }

    private async Task<string> CallLLMWithRAGAsync(string message, DriverInfo driverInfo, List<KnowledgeBase> ragContext)
    {
        // Build RAG-enriched prompt
        var contextText = string.Join("\n\n", ragContext.Select(k => $"📚 {k.Title}:\n{k.Content}"));

        var prompt = $@"Tu es l'assistant IA TMS (Transport Management System), un expert complet du projet de gestion de transport.

═══════════════════════════════════════════════════════════
📋 CONTEXTE RAG (Base de connaissances pertinente) :
═══════════════════════════════════════════════════════════
{contextText}

═══════════════════════════════════════════════════════════
👤 INFORMATIONS DU CHAUFFEUR (Temps réel) :
═══════════════════════════════════════════════════════════
• Nom : {driverInfo.DriverName}
• Trajet actuel : {driverInfo.TripReference}
• Statut : {driverInfo.Status}
• Livraisons : {driverInfo.DeliveriesCount}

═══════════════════════════════════════════════════════════
❓ QUESTION DU CHAUFFEUR :
═══════════════════════════════════════════════════════════
{message}

═══════════════════════════════════════════════════════════
📝 INSTRUCTIONS DE RÉPONSE :
═══════════════════════════════════════════════════════════
1. Utilise le contexte RAG pour répondre précisément
2. Utilise les données temps réel du chauffeur si pertinent
3. Sois professionnel, concis et utile
4. Utilise des emojis si pertinent
5. Réponds TOUJOURS en français
6. Si tu ne sais pas, dis-le honnêtement

RÉPONSE :";

        var ollamaRequest = new
        {
            model = _llmModel,
            prompt = prompt,
            stream = false,
            options = new
            {
                temperature = 0.7,
                max_tokens = 800,
                num_ctx = 4096
            }
        };

        var content = new StringContent(
            JsonSerializer.Serialize(ollamaRequest),
            Encoding.UTF8,
            "application/json");

        var response = await _httpClient.PostAsync($"{_ollamaEndpoint}/api/generate", content);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseJson);

        if (doc.RootElement.TryGetProperty("response", out var contentElement))
        {
            return contentElement.GetString() ?? GenerateIntelligentResponseWithRAG(message, driverInfo, ragContext);
        }

        return GenerateIntelligentResponseWithRAG(message, driverInfo, ragContext);
    }

    private string GenerateIntelligentResponseWithRAG(string message, DriverInfo driverInfo, List<KnowledgeBase> ragContext)
    {
        var lowerMessage = message.ToLower().Trim();

        // ✅ FIRST: Check for questions that need REAL-TIME database data (not RAG)
        
        // Questions sur les notifications - MUST check first to get real unread count
        if (lowerMessage.Contains("notification") || lowerMessage.Contains("notifications") ||
            lowerMessage.Contains("message") || lowerMessage.Contains("messages") ||
            lowerMessage.Contains("alerte") || lowerMessage.Contains("alertes") ||
            lowerMessage.Contains("badge") ||
            lowerMessage.Contains("non lu") || lowerMessage.Contains("non lus") ||
            lowerMessage.Contains("non lue") || lowerMessage.Contains("non lues") ||
            lowerMessage.Contains("pas lu"))
        {
            return GenerateNotificationResponse(new DriverContext { DriverInfo = driverInfo, Message = lowerMessage });
        }

        // Questions sur les trajets réels du chauffeur
        if (lowerMessage.Contains("trajet") || lowerMessage.Contains("trajets") ||
            lowerMessage.Contains("voyage") || lowerMessage.Contains("voyages") ||
            lowerMessage.Contains("mission") || lowerMessage.Contains("missions"))
        {
            if (lowerMessage.Contains("nouveau") || lowerMessage.Contains("nouvelles") ||
                lowerMessage.Contains("où") || lowerMessage.Contains("ou sont") ||
                lowerMessage.Contains("liste") || lowerMessage.Contains("mes"))
            {
                return GenerateRealTripsResponse(driverInfo.DriverId);
            }
        }

        // Questions sur les destinations réelles
        if (lowerMessage.Contains("destination") || lowerMessage.Contains("destinations") ||
            (lowerMessage.Contains("où") && (lowerMessage.Contains("aller") || lowerMessage.Contains("livraison"))))
        {
            if (lowerMessage.Contains("voyage") || lowerMessage.Contains("trajet") ||
                lowerMessage.Contains("livraison") || lowerMessage.Contains("chaque"))
            {
                return GenerateRealDestinationsResponse(driverInfo.DriverId);
            }
        }

        // Questions sur les livraisons réelles
        if (lowerMessage.Contains("livraison") || lowerMessage.Contains("livraisons") ||
            lowerMessage.Contains("prochaine") || lowerMessage.Contains("cliente") ||
            lowerMessage.Contains("client") || lowerMessage.Contains("adresse"))
        {
            if (lowerMessage.Contains("où") || lowerMessage.Contains("liste") ||
                lowerMessage.Contains("prochain") || lowerMessage.Contains("mes"))
            {
                return GenerateRealDeliveriesResponse(driverInfo);
            }
        }

        // Questions sur la prochaine livraison - needs real trip data
        if (lowerMessage.Contains("prochaine livraison") ||
            (lowerMessage.Contains("où est") && (lowerMessage.Contains("livraison") || lowerMessage.Contains("prochain"))) ||
            (lowerMessage.Contains("donne") && lowerMessage.Contains("détail")))
        {
            return GenerateDeliveryResponse(new DriverContext { DriverInfo = driverInfo, CurrentTrip = GetCurrentTripDetails(driverInfo), Message = lowerMessage });
        }

        // Questions sur le chargement
        if (lowerMessage.Contains("chargement") || lowerMessage.Contains("charger"))
        {
            return GenerateLoadingResponse(new DriverContext { DriverInfo = driverInfo, CurrentTrip = GetCurrentTripDetails(driverInfo), Message = lowerMessage });
        }

        // Questions sur le temps d'arrivée
        if (lowerMessage.Contains("heure") || lowerMessage.Contains("temps") ||
            lowerMessage.Contains("arrivée") || lowerMessage.Contains("eta"))
        {
            return GenerateETAResponse(new DriverContext { DriverInfo = driverInfo, CurrentTrip = GetCurrentTripDetails(driverInfo), Message = lowerMessage });
        }

        // Questions sur les livraisons restantes
        if ((lowerMessage.Contains("combien") || lowerMessage.Contains("reste")) &&
            (lowerMessage.Contains("livraison") || lowerMessage.Contains("reste")))
        {
            return GenerateRemainingDeliveriesResponse(new DriverContext { DriverInfo = driverInfo, CurrentTrip = GetCurrentTripDetails(driverInfo), Message = lowerMessage });
        }

        // ✅ THEN: Check RAG knowledge base for static information
        foreach (var item in ragContext)
        {
            if (item.Keywords.Any(k => lowerMessage.Contains(k)))
            {
                return item.Content;
            }
        }

        // ✅ THEN: Check other categories that need context
        var context = new DriverContext
        {
            DriverInfo = driverInfo,
            CurrentTrip = GetCurrentTripDetails(driverInfo),
            Message = lowerMessage
        };

        // Questions sur le carburant
        if (lowerMessage.Contains("plein") || lowerMessage.Contains("carburant") ||
            lowerMessage.Contains("essence") || lowerMessage.Contains("gasoil"))
        {
            return GetKnowledgeByCategory("fuel");
        }

        // Questions sur les problèmes/urgences
        if (lowerMessage.Contains("problème") || lowerMessage.Contains("urgence") ||
            lowerMessage.Contains("panne") || lowerMessage.Contains("accident"))
        {
            return GetKnowledgeByCategory("emergency");
        }

        // Questions sur le support/contact
        if (lowerMessage.Contains("support") || lowerMessage.Contains("contact") ||
            lowerMessage.Contains("téléphone") || lowerMessage.Contains("appeler"))
        {
            return GetKnowledgeByCategory("support");
        }

        // Questions sur les pauses/repos
        if (lowerMessage.Contains("pause") || lowerMessage.Contains("repos") ||
            lowerMessage.Contains("déjeuner") || lowerMessage.Contains("manger"))
        {
            return GetKnowledgeByCategory("breaks");
        }

        // Questions sur le GPS/navigation
        if (lowerMessage.Contains("gps") || lowerMessage.Contains("navigation") ||
            lowerMessage.Contains("itinéraire") || lowerMessage.Contains("carte"))
        {
            return GetKnowledgeByCategory("gps");
        }

        // Questions sur l'application
        if (lowerMessage.Contains("application") || lowerMessage.Contains("app") ||
            lowerMessage.Contains("fonctionnalité") || lowerMessage.Contains("utiliser"))
        {
            return GetKnowledgeByCategory("app");
        }

        // Questions sur le workflow
        if (lowerMessage.Contains("trajet") || lowerMessage.Contains("voyage") ||
            lowerMessage.Contains("mission") || lowerMessage.Contains("statut") ||
            lowerMessage.Contains("étape"))
        {
            return GetKnowledgeByCategory("workflow");
        }

        // Questions sur l'acceptation/refus
        if (lowerMessage.Contains("accepter") || lowerMessage.Contains("refuser") ||
            lowerMessage.Contains("assigné"))
        {
            return GetKnowledgeByCategory("accept");
        }

        // Questions sur le web admin
        if (lowerMessage.Contains("admin") || lowerMessage.Contains("web") ||
            lowerMessage.Contains("suivi"))
        {
            return GetKnowledgeByCategory("web_admin");
        }

        // Salutations
        if (lowerMessage.Contains("bonjour") || lowerMessage.Contains("salut") ||
            lowerMessage.Contains("coucou") || lowerMessage.Contains("hello") ||
            lowerMessage.Contains("salam") || lowerMessage.Contains("bonsoir"))
        {
            return GetKnowledgeByCategory("greetings");
        }

        // Remerciements
        if (lowerMessage.Contains("merci") || lowerMessage.Contains("thanks") ||
            lowerMessage.Contains("super") || lowerMessage.Contains("parfait") ||
            lowerMessage.Contains("genial"))
        {
            return GetKnowledgeByCategory("thanks");
        }

        // Réponse par défaut intelligente avec suggestions
        return GenerateDefaultResponse(context);
    }

    private string GenerateDeliveryResponse(DriverContext context)
    {
        if (context.DriverInfo.Status == "En attente" || string.IsNullOrEmpty(context.DriverInfo.TripReference))
        {
            return "📋 Vous n'avez pas de trajet en cours actuellement.\n\n" +
                   "Consultez l'onglet **'Mes Trajets'** pour voir vos missions disponibles et en accepter une.";
        }

        var trip = context.CurrentTrip;
        var deliveriesText = trip?.PendingDeliveries > 0
            ? $"Il vous reste **{trip.PendingDeliveries} livraison(s)** à effectuer."
            : "Toutes vos livraisons sont terminées ! 🎉";

        return $"📍 **Trajet en cours : {context.DriverInfo.TripReference}**\n\n" +
               $"📊 Statut : {context.DriverInfo.Status}\n" +
               $"📦 {deliveriesText}\n" +
               $"🏁 Destination : Consultez l'itinéraire GPS dans l'app\n\n" +
               $"💡 Pour voir les détails complets (adresses, contacts clients) :\n" +
               $"1. Ouvrez **'Mes Trajets'**\n" +
               $"2. Cliquez sur le trajet **{context.DriverInfo.TripReference}**\n" +
               $"3. Consultez la liste des livraisons";
    }

    private string GenerateLoadingResponse(DriverContext context)
    {
        if (context.DriverInfo.Status == "En attente")
        {
            return "📋 Vous n'avez pas de trajet en cours.\n\n" +
                   "✅ Acceptez d'abord une mission depuis **'Mes Trajets**'.";
        }

        return $"📦 **Chargement - Trajet {context.DriverInfo.TripReference}**\n\n" +
               $"**Pour commencer le chargement :**\n" +
               $"1️⃣ Allez dans le détail du trajet\n" +
               $"2️⃣ Cliquez sur **'Commencer le chargement'**\n" +
               $"3️⃣ Confirmez l'heure de début\n\n" +
               $"⚠️ **Points importants :**\n" +
               $"• Vérifiez l'arrimage des marchandises\n" +
               $"• Contrôlez le poids vs capacité du camion\n" +
               $"• Signalez tout problème au support\n\n" +
               $"📍 Assurez-vous que le camion est au quai de chargement.";
    }

    private string GenerateETAResponse(DriverContext context)
    {
        if (context.DriverInfo.Status == "En attente")
        {
            return "⏰ Vous n'avez pas de trajet en cours.\n\n" +
                   "L'heure d'arrivée sera calculée une fois votre mission commencée.";
        }

        return $"⏰ **Estimation d'arrivée - {context.DriverInfo.TripReference}**\n\n" +
               $"L'heure d'arrivée estimée dépend de :\n" +
               $"• 🚗 Trafic en temps réel\n" +
               $"• 📏 Distance restante\n" +
               $"• 📦 Nombre de livraisons ({context.DriverInfo.DeliveriesCount})\n" +
               $"• 🛣️ Conditions routières\n\n" +
               $"💡 Consultez l'application pour voir :\n" +
               $"• L'estimation GPS en temps réel\n" +
               $"• Votre position sur la carte\n" +
               $"• L'itinéraire optimisé\n\n" +
               $"📊 L'admin voit aussi votre position en temps réel !";
    }

    private string GenerateRemainingDeliveriesResponse(DriverContext context)
    {
        if (context.DriverInfo.Status == "En attente")
        {
            return "📦 Vous n'avez pas de trajet en cours.\n\n" +
                   "Acceptez une mission pour voir vos livraisons.";
        }

        var trip = context.CurrentTrip;
        var deliveriesCount = trip?.PendingDeliveries ?? context.DriverInfo.DeliveriesCount;

        return $"📦 **Livraisons - {context.DriverInfo.TripReference}**\n\n" +
               $"Il vous reste **{deliveriesCount} livraison(s)** à effectuer.\n\n" +
               $"📊 **Statuts possibles :**\n" +
               $"• ⏳ En attente\n" +
               $"• 🚚 En cours\n" +
               $"• ✅ Terminée\n\n" +
               $"💡 Chaque livraison est marquée dans l'application.\n" +
               $"Scannez le QR code du client pour valider chaque livraison.";
    }

    private string GenerateNotificationResponse(DriverContext context)
    {
        try
        {
            // Use the actual driver ID from context
            var driverId = context.DriverInfo.DriverId;
            
            _logger.LogInformation($"🔔 Notification request for driverId={driverId}");

            if (driverId == 0)
            {
                return "🔔 **Vos Notifications:**\n\n" +
                       "Pour voir vos notifications non lues :\n" +
                       "1️⃣ Ouvrez l'application mobile\n" +
                       "2️⃣ Cliquez sur l'icône 🔔 en haut\n" +
                       "3️⃣ Consultez la liste complète\n\n" +
                       "💡 Les notifications incluent :\n" +
                       "• Nouvelles missions assignées\n" +
                       "• Changements de statut\n" +
                       "• Rappels importants";
            }

            // Count ALL unread notifications for this user ID
            var unreadCount = _context.UserNotifications
                .Include(un => un.Notification)
                .Where(un => un.UserId == driverId && !un.IsRead)
                .Count();

            _logger.LogInformation($"🔔 Driver {driverId} has {unreadCount} unread notifications in database");

            // Get recent unread notifications with full details
            var recentNotifications = _context.UserNotifications
                .Include(un => un.Notification)
                .Where(un => un.UserId == driverId && !un.IsRead)
                .OrderByDescending(un => un.Notification.Timestamp)
                .Take(5)
                .ToList();

            if (unreadCount == 0)
            {
                return $"🔔 **Vos Notifications:**\n\n" +
                       $"✅ **Aucune notification non lue !**\n\n" +
                       $"Tout est à jour. Bonne route ! 🚛";
            }

            var response = $"🔔 **Vos Notifications:**\n\n" +
                          $"📬 Vous avez **{unreadCount} notification(s) non lue(s)**\n\n";

            if (recentNotifications.Count > 0)
            {
                response += "**Récentes:**\n";
                int i = 1;
                foreach (var un in recentNotifications)
                {
                    var notif = un.Notification;
                    response += $"{i}. **{notif.Title}**\n";
                    response += $"   {notif.Message}\n\n";
                    i++;
                }
            }

            response += $"💡 Pour tout voir :\n" +
                       $"1️⃣ Ouvrez l'app mobile\n" +
                       $"2️⃣ Cliquez sur l'icône 🔔\n" +
                       $"3️⃣ Consultez la liste complète";

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in GenerateNotificationResponse");
            return "🔔 **Vos Notifications:**\n\n" +
                   "Je ne peux pas accéder à vos notifications pour le moment.\n\n" +
                   "💡 Consultez l'app mobile → Icône 🔔";
        }
    }

    private string GenerateRealTripsResponse(int driverId)
    {
        try
        {
            _logger.LogInformation($"🚛 Getting real trips for driverId={driverId}");

            // Get all trips for this driver, ordered by creation date
            var trips = _context.Trips
                .Where(t => t.DriverId == driverId)
                .OrderByDescending(t => t.CreatedAt)
                .Take(10)
                .ToList();

            if (trips.Count == 0)
            {
                return $"🚛 **Vos Trajets:**\n\n" +
                       $"Aucun trajet assigné pour le moment.\n\n" +
                       $"💡 Les nouvelles missions apparaîtront ici dès qu'un admin vous en assignera.";
            }

            var activeTrips = trips.Where(t => 
                t.TripStatus == TripStatus.Accepted ||
                t.TripStatus == TripStatus.Loading ||
                t.TripStatus == TripStatus.InDelivery ||
                t.TripStatus == TripStatus.Arrived).ToList();

            var pendingTrips = trips.Where(t => 
                t.TripStatus == TripStatus.Pending ||
                t.TripStatus == TripStatus.Assigned).ToList();

            var completedTrips = trips.Where(t => 
                t.TripStatus == TripStatus.Completed ||
                t.TripStatus == TripStatus.Cancelled ||
                t.TripStatus == TripStatus.Refused).ToList();

            var response = $"🚛 **Vos Trajets:**\n\n";

            if (activeTrips.Count > 0)
            {
                response += $"**🟢 En cours ({activeTrips.Count}):**\n";
                foreach (var trip in activeTrips.Take(5))
                {
                    response += $"• **{trip.TripReference}** - {trip.TripStatus}\n";
                }
                response += "\n";
            }

            if (pendingTrips.Count > 0)
            {
                response += $"**🟡 En attente ({pendingTrips.Count}):**\n";
                foreach (var trip in pendingTrips.Take(3))
                {
                    response += $"• **{trip.TripReference}** - À accepter\n";
                }
                response += "\n";
            }

            response += $"📊 **Total:** {trips.Count} trajet(s)\n\n";
            response += $"💡 Pour voir les détails complets :\n" +
                       $"1️⃣ Ouvrez **'Mes Trajets'** dans l'app\n" +
                       $"2️⃣ Cliquez sur un trajet pour voir les détails";

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in GenerateRealTripsResponse");
            return "🚛 **Vos Trajets:**\n\nJe ne peux pas accéder à vos trajets pour le moment.\n\n💡 Consultez l'onglet 'Mes Trajets' dans l'app.";
        }
    }

    private string GenerateRealDestinationsResponse(int driverId)
    {
        try
        {
            _logger.LogInformation($"📍 Getting real destinations for driverId={driverId}");

            // Get active trips with their deliveries
            var trips = _context.Trips
                .Where(t => t.DriverId == driverId && 
                    (t.TripStatus == TripStatus.Accepted ||
                     t.TripStatus == TripStatus.Loading ||
                     t.TripStatus == TripStatus.InDelivery ||
                     t.TripStatus == TripStatus.Arrived))
                .Include(t => t.Deliveries)
                .OrderByDescending(t => t.CreatedAt)
                .Take(5)
                .ToList();

            if (trips.Count == 0)
            {
                return $"📍 **Vos Destinations:**\n\n" +
                       $"Aucun trajet actif en ce moment.\n\n" +
                       $"💡 Acceptez une mission pour voir vos destinations.";
            }

            var response = $"📍 **Vos Destinations:**\n\n";

            foreach (var trip in trips)
            {
                response += $"**🚛 {trip.TripReference}** ({trip.TripStatus})\n";
                
                if (trip.Deliveries != null && trip.Deliveries.Count > 0)
                {
                    var pendingDeliveries = trip.Deliveries
                        .Where(d => d.Status == Delivery.DeliveryStatus.Pending || d.Status == Delivery.DeliveryStatus.EnRoute)
                        .OrderBy(d => d.Sequence)
                        .ToList();

                    if (pendingDeliveries.Count > 0)
                    {
                        response += $"📦 Livraisons en attente:\n";
                        foreach (var delivery in pendingDeliveries.Take(3))
                        {
                            response += $"  • {delivery.DeliveryAddress ?? "Adresse non disponible"}\n";
                        }
                    }
                    else
                    {
                        response += $"✅ Toutes les livraisons terminées\n";
                    }
                }
                else
                {
                    var hasCoords = (trip.EndLatitude != null && trip.EndLongitude != null);
                    response += $"  📍 Destination: {(hasCoords ? "Coordonnées GPS définies" : "Non définie")}\n";
                }
                response += "\n";
            }

            response += $"💡 Pour naviguer vers une destination :\n" +
                       $"1️⃣ Ouvrez le détail du trajet\n" +
                       $"2️⃣ Cliquez sur **'Démarrer GPS'**\n" +
                       $"3️⃣ Suivez l'itinéraire en temps réel";

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in GenerateRealDestinationsResponse");
            return "📍 **Vos Destinations:**\n\nJe ne peux pas accéder à vos destinations pour le moment.\n\n💡 Consultez l'onglet 'Mes Trajets' dans l'app.";
        }
    }

    private string GenerateRealDeliveriesResponse(DriverInfo driverInfo)
    {
        try
        {
            var driverId = driverInfo.DriverId;
            _logger.LogInformation($"📦 Getting real deliveries for driverId={driverId}");

            // Get current active trip
            var currentTrip = _context.Trips
                .Where(t => t.DriverId == driverId && 
                    (t.TripStatus == TripStatus.Accepted ||
                     t.TripStatus == TripStatus.Loading ||
                     t.TripStatus == TripStatus.InDelivery ||
                     t.TripStatus == TripStatus.Arrived))
                .Include(t => t.Deliveries)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefault();

            if (currentTrip == null)
            {
                return $"📦 **Vos Livraisons:**\n\n" +
                       $"Aucun trajet actif en ce moment.\n\n" +
                       $"💡 Acceptez une mission pour voir vos livraisons.";
            }

            var response = $"📦 **Livraisons - {currentTrip.TripReference}**\n\n";

            if (currentTrip.Deliveries != null && currentTrip.Deliveries.Count > 0)
            {
                var pendingDeliveries = currentTrip.Deliveries
                    .Where(d => d.Status == Delivery.DeliveryStatus.Pending || d.Status == Delivery.DeliveryStatus.EnRoute)
                    .OrderBy(d => d.Sequence)
                    .ToList();

                var completedDeliveries = currentTrip.Deliveries
                    .Where(d => d.Status == Delivery.DeliveryStatus.Delivered)
                    .Count();

                response += $"📊 **Statistiques:**\n";
                response += $"• En attente: {pendingDeliveries.Count}\n";
                response += $"• Terminées: {completedDeliveries}\n";
                response += $"• Total: {currentTrip.Deliveries.Count}\n\n";

                if (pendingDeliveries.Count > 0)
                {
                    response += $"**📍 Prochaines livraisons:**\n";
                    for (int i = 0; i < Math.Min(3, pendingDeliveries.Count); i++)
                    {
                        var delivery = pendingDeliveries[i];
                        response += $"{i + 1}. **{delivery.DeliveryAddress ?? "Adresse non disponible"}**\n";
                        if (!string.IsNullOrEmpty(delivery.Customer?.Name))
                        {
                            response += $"   👤 Client: {delivery.Customer.Name}\n";
                        }
                        response += "\n";
                    }
                }
            }
            else
            {
                response += $"Aucune livraison définie pour ce trajet.\n\n";
            }

            response += $"💡 Pour marquer une livraison comme terminée :\n" +
                       $"1️⃣ Arrivez à l'adresse du client\n" +
                       $"2️⃣ Scannez le **QR code** du client\n" +
                       $"3️⃣ Ou confirmez manuellement dans l'app";

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in GenerateRealDeliveriesResponse");
            return "📦 **Vos Livraisons:**\n\nJe ne peux pas accéder à vos livraisons pour le moment.\n\n💡 Consultez l'onglet 'Mes Trajets' dans l'app.";
        }
    }

    private string GenerateDefaultResponse(DriverContext context)
    {
        var tripInfo = context.DriverInfo.Status != "En attente"
            ? $"\n📍 **Votre trajet actuel :** {context.DriverInfo.TripReference} ({context.DriverInfo.Status})\n" +
              $"📦 Livraisons : {context.DriverInfo.DeliveriesCount}\n"
            : "";

        return $"🤖 **Assistant IA TMS**{tripInfo}\n\n" +
               $"Je peux vous aider avec :\n\n" +
               $"• 📋 **Vos trajets** : 'Où est ma prochaine livraison ?'\n" +
               $"• 📦 **Livraisons** : 'Combien de livraisons restantes ?'\n" +
               $"• ⏰ **Horaires** : 'Quelle est l'heure d'arrivée ?'\n" +
               $"• 🗺️ **GPS** : 'Comment fonctionne la navigation ?'\n" +
               $"• ⛽ **Carburant** : 'Où faire le plein ?'\n" +
               $"• ⚠️ **Urgences** : 'J'ai une panne'\n" +
               $"• 📞 **Support** : 'Comment contacter le support ?'\n" +
               $"• 📱 **App** : 'Comment utiliser l'application ?'\n\n" +
               $"💡 Posez-moi une question précise !";
    }

    private string GetKnowledgeByCategory(string category)
    {
        var entry = _knowledgeBase.FirstOrDefault(k => k.Category == category);
        return entry?.Content ?? GenerateDefaultResponse(new DriverContext { Message = "" });
    }

    private TripDetails? GetCurrentTripDetails(DriverInfo driverInfo)
    {
        if (driverInfo.Status == "En attente") return null;

        return new TripDetails
        {
            Reference = driverInfo.TripReference,
            Status = driverInfo.Status,
            PendingDeliveries = driverInfo.DeliveriesCount,
            TotalDeliveries = driverInfo.DeliveriesCount
        };
    }

    public async Task<List<KnowledgeBase>> GetContextAsync(int driverId, string query)
    {
        // ✅ RAG: Retrieve relevant knowledge base entries
        var keywords = query.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 3)
            .Distinct()
            .ToList();

        var relevantKnowledge = new List<(KnowledgeEntry Entry, int Score)>();

        // Score each knowledge entry by keyword match
        foreach (var entry in _knowledgeBase)
        {
            var score = keywords.Count(k => entry.Keywords.Any(ek => ek.Contains(k) || k.Contains(ek)));
            if (score > 0)
            {
                relevantKnowledge.Add((entry, score));
            }
        }

        // Sort by relevance (score) and take top 3
        var topKnowledge = relevantKnowledge
            .OrderByDescending(k => k.Score)
            .Take(3)
            .Select(k => new KnowledgeBase
            {
                Id = _knowledgeBase.IndexOf(k.Entry),
                Title = k.Entry.Title,
                Content = k.Entry.Content,
                Category = k.Entry.Category,
                Keywords = k.Entry.Keywords.ToList()
            })
            .ToList();

        _logger.LogInformation($"📚 Retrieved {topKnowledge.Count} knowledge items for query: {query}");

        return topKnowledge;
    }

    private async Task<DriverInfo> GetDriverInfoAsync(int driverId)
    {
        _logger.LogInformation($"👤 Getting driver info for driverId={driverId}");

        // Try to find driver by ID in Employees table
        var driver = await _context.Employees
            .OfType<Driver>()
            .FirstOrDefaultAsync(d => d.Id == driverId);

        if (driver == null)
        {
            _logger.LogWarning($"⚠️ Driver with Id={driverId} not found in Employees table. Using fallback.");
            
            // Even if driver not found, return the driverId for notifications
            return new DriverInfo
            {
                DriverId = driverId, // ✅ CRITICAL: Always preserve the original driverId
                IsAvailable = false,
                DriverName = "Chauffeur",
                TripReference = "Aucun",
                Status = "En attente",
                DeliveriesCount = 0
            };
        }

        // Get current trip for this driver (any active status)
        var currentTrip = await _context.Trips
            .Where(t => t.DriverId == driverId)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(t => t.TripStatus == TripStatus.DeliveryInProgress ||
                                      t.TripStatus == TripStatus.Loading ||
                                      t.TripStatus == TripStatus.Accepted ||
                                      t.TripStatus == TripStatus.Arrived);

        var deliveriesCount = 0;
        if (currentTrip != null)
        {
            deliveriesCount = await _context.Deliveries
                .CountAsync(d => d.TripId == currentTrip.Id);
        }

        _logger.LogInformation($"✅ Driver found: Id={driver.Id}, Name={driver.Name}, Trip={currentTrip?.TripReference ?? "None"}");

        return new DriverInfo
        {
            DriverId = driverId, // ✅ CRITICAL: Always set the driverId
            IsAvailable = true,
            DriverName = driver.Name ?? "Chauffeur",
            TripReference = currentTrip?.TripReference ?? "Aucun",
            Status = currentTrip?.TripStatus.ToString() ?? "En attente",
            DeliveriesCount = deliveriesCount
        };
    }

    private string BuildContextText(List<KnowledgeBase> context)
    {
        if (context.Count == 0) return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine("📚 CONTEXTE DE CONNAISSANCE (RAG) :");
        foreach (var item in context)
        {
            sb.AppendLine($"• {item.Title}: {item.Content}");
        }
        return sb.ToString();
    }

    private string BuildPrompt(string userMessage, string context, DriverInfo driverInfo, List<TransportManagementSystem.Entity.ChatMessage>? history)
    {
        var systemPrompt = @"Tu es un assistant IA intelligent et professionnel pour les chauffeurs de transport routier.
Tu aides les chauffeurs avec :
- Leurs trajets en cours
- Les livraisons
- Les procédures de l'entreprise
- La sécurité routière
- Les questions générales sur le travail

Sois :
- Professionnel et courtois
- Concis et clair
- Utile et pratique
- En français

Informations sur le chauffeur :
- Nom: " + driverInfo.DriverName + @"
- Trajet actuel: " + driverInfo.TripReference + @"
- Statut: " + driverInfo.Status + @"
- Nombre de livraisons: " + driverInfo.DeliveriesCount + @"

" + context + @"

Réponds à la question du chauffeur en utilisant le contexte si disponible.";

        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

        // Add conversation history
        if (history != null && history.Count > 0)
        {
            foreach (var msg in history.TakeLast(10)) // Keep last 10 messages
            {
                messages.Add(new { role = msg.MessageType, content = msg.Message });
            }
        }

        // Add current message
        messages.Add(new { role = "user", content = userMessage });

        return JsonSerializer.Serialize(messages);
    }

    private async Task<string> CallLLMAsync(string prompt)
    {
        try
        {
            var request = new
            {
                model = _llmModel,
                messages = JsonSerializer.Deserialize<List<object>>(prompt),
                stream = false,
                options = new
                {
                    temperature = 0.7,
                    max_tokens = 500
                }
            };

            var content = new StringContent(
                JsonSerializer.Serialize(request),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync($"{_ollamaEndpoint}/api/chat", content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            if (doc.RootElement.TryGetProperty("message", out var messageElement) &&
                messageElement.TryGetProperty("content", out var contentElement))
            {
                return contentElement.GetString() ?? "Je n'ai pas compris la question.";
            }

            return "Je n'ai pas compris la question.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ LLM call failed");
            return GetFallbackResponse(prompt);
        }
    }

    private string GetFallbackResponse(string prompt)
    {
        return GenerateDefaultResponse(new DriverContext { Message = prompt });
    }
}

// ✅ RAG Knowledge Entry
public class KnowledgeEntry
{
    public string Category { get; set; } = string.Empty;
    public string[] Keywords { get; set; } = Array.Empty<string>();
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

// ✅ Driver Context for intelligent responses
public class DriverContext
{
    public DriverInfo DriverInfo { get; set; } = new();
    public TripDetails? CurrentTrip { get; set; }
    public string Message { get; set; } = string.Empty;
}

// ✅ Trip Details
public class TripDetails
{
    public string Reference { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int PendingDeliveries { get; set; }
    public int TotalDeliveries { get; set; }
}

public class DriverInfo
{
    public int DriverId { get; set; }
    public bool IsAvailable { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string TripReference { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int DeliveriesCount { get; set; }
}