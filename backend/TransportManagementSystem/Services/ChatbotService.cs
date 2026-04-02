using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

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

            // Step 1: Get driver's current trip info
            var driverInfo = await GetDriverInfoAsync(request.DriverId);

            // Step 2: Try to use Ollama LLM, fallback to rule-based if not available
            string response;
            try
            {
                response = await CallLLMAsync(request.Message, driverInfo);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ Ollama not available, using rule-based responses");
                response = GenerateIntelligentResponse(request.Message, driverInfo);
            }

            _logger.LogInformation($"🤖 Chatbot response: {response}");

            return new ChatResponse
            {
                Message = response,
                Source = response.Contains("📍") || response.Contains("🚛") ? "Database" : "AI",
                IsConfident = !string.IsNullOrEmpty(response) && response.Length > 10,
                Context = new Dictionary<string, object>
                {
                    { "tripReference", driverInfo.TripReference },
                    { "status", driverInfo.Status },
                    { "deliveriesCount", driverInfo.DeliveriesCount }
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

    private async Task<string> CallLLMAsync(string message, DriverInfo driverInfo)
    {
        // Build intelligent prompt with driver's actual data
        var prompt = $@"Tu es l'assistant IA professionnel d'une entreprise de transport. Tu aides les chauffeurs avec leurs trajets et livraisons.

INFORMATIONS DU CHAUFFEUR (à utiliser pour répondre) :
- Trajet actuel : {driverInfo.TripReference}
- Statut : {driverInfo.Status}
- Nombre de livraisons : {driverInfo.DeliveriesCount}

QUESTION DU CHAUFFEUR : {message}

RÉPONSE (en français, professionnel, utile, avec emojis si pertinent) :";

        try
        {
            var request = new
            {
                model = "llama3.1",
                prompt = prompt,
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

            var response = await _httpClient.PostAsync($"{_ollamaEndpoint}/api/generate", content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            if (doc.RootElement.TryGetProperty("response", out var contentElement))
            {
                return contentElement.GetString() ?? GenerateIntelligentResponse(message, driverInfo);
            }

            return GenerateIntelligentResponse(message, driverInfo);
        }
        catch
        {
            // Fallback to rule-based if Ollama fails
            return GenerateIntelligentResponse(message, driverInfo);
        }
    }

    private string GenerateIntelligentResponse(string message, DriverInfo driverInfo)
    {
        var lowerMessage = message.ToLower();

        // Questions sur la prochaine livraison
        if (lowerMessage.Contains("prochaine livraison") || 
            (lowerMessage.Contains("où est") && (lowerMessage.Contains("livraison") || lowerMessage.Contains("prochain"))) ||
            (lowerMessage.Contains("donne") && lowerMessage.Contains("détail")))
        {
            if (driverInfo.Status == "En attente" || string.IsNullOrEmpty(driverInfo.TripReference))
            {
                return "Vous n'avez pas de trajet en cours actuellement. Consultez l'onglet 'Mes Trajets' pour voir vos missions disponibles.";
            }

            return $"Actuellement, vous êtes sur le trajet **{driverInfo.TripReference}** (Statut: {driverInfo.Status}). " +
                   $"Vous avez **{driverInfo.DeliveriesCount} livraison(s)** à effectuer. " +
                   $"Pour voir les détails complets (adresses, horaires, contacts clients), ouvrez l'onglet 'Mes Trajets' dans l'application.";
        }

        // Questions sur le chargement
        if (lowerMessage.Contains("chargement") || lowerMessage.Contains("charger"))
        {
            if (driverInfo.Status == "En attente")
            {
                return "Vous n'avez pas de trajet en cours. Acceptez d'abord une mission depuis l'onglet 'Mes Trajets'.";
            }

            return $"Pour votre trajet {driverInfo.TripReference} :\n\n" +
                   $"**Pour commencer le chargement :**\n" +
                   $"1. Allez dans le détail du trajet\n" +
                   $"2. Cliquez sur 'Commencer le chargement'\n" +
                   $"3. Confirmez l'heure de début\n\n" +
                   $"Assurez-vous que le camion est bien positionné au quai de chargement.";
        }

        // Questions sur le temps d'arrivée
        if (lowerMessage.Contains("heure") || lowerMessage.Contains("temps") || 
            lowerMessage.Contains("arrivée") || lowerMessage.Contains("temps"))
        {
            if (driverInfo.Status == "En attente")
            {
                return "Vous n'avez pas de trajet en cours. L'heure d'arrivée sera calculée une fois votre mission commencée.";
            }

            return $"Pour le trajet {driverInfo.TripReference}, l'heure d'arrivée estimée dépend :\n" +
                   $"• Du trafic en temps réel\n" +
                   $"• De la distance restante\n" +
                   $"• Du nombre de livraisons ({driverInfo.DeliveriesCount})\n\n" +
                   $"Consultez l'application pour voir l'estimation en temps réel basée sur votre position GPS.";
        }

        // Questions sur les livraisons restantes
        if ((lowerMessage.Contains("combien") || lowerMessage.Contains("reste")) && 
            (lowerMessage.Contains("livraison") || lowerMessage.Contains("reste")))
        {
            if (driverInfo.Status == "En attente")
            {
                return "Vous n'avez pas de trajet en cours. Acceptez une mission pour voir vos livraisons.";
            }

            return $"Sur votre trajet **{driverInfo.TripReference}**, vous avez **{driverInfo.DeliveriesCount} livraison(s)** à effectuer. " +
                   $"Chaque livraison est marquée comme 'En attente', 'En cours' ou 'Terminée' dans l'application.";
        }

        // Questions sur le carburant
        if (lowerMessage.Contains("plein") || lowerMessage.Contains("carburant") || 
            lowerMessage.Contains("essence") || lowerMessage.Contains("gasoil"))
        {
            return "**Pour faire le plein :**\n" +
                   "1. Utilisez une station partenaire TMS\n" +
                   "2. Les stations partenaires sont listées dans l'application (section 'Stations')\n" +
                   "3. Conservez les reçus pour le remboursement\n" +
                   "4. Signalez le plein dans l'application";
        }

        // Questions sur les problèmes/urgences
        if (lowerMessage.Contains("problème") || lowerMessage.Contains("urgence") || 
            lowerMessage.Contains("panne") || lowerMessage.Contains("accident"))
        {
            return "**En cas de problème (panne, accident, retard) :**\n\n" +
                   "1. **Mettez-vous en sécurité** (gilets fluorescents, triangle de signalisation)\n" +
                   "2. **Contactez le support TMS** : +216 XX XXX XXX\n" +
                   "3. **Signalez l'incident** dans l'application (section 'Signaler un problème')\n" +
                   "4. **Prenez des photos** si nécessaire (accident, panne)\n\n" +
                   "Le support vous assistera immédiatement.";
        }

        // Questions sur le support/contact
        if (lowerMessage.Contains("support") || lowerMessage.Contains("contact") || 
            lowerMessage.Contains("téléphone") || lowerMessage.Contains("appeler"))
        {
            return "**Contacts TMS :**\n\n" +
                   "📞 **Support technique** : +216 XX XXX XXX\n" +
                   "📧 **Email** : support@tms.com\n" +
                   "💬 **Via l'application** : Section 'Aide' > 'Contacter le support'\n\n" +
                   "Horaires : Lundi-Vendredi 8h-18h, Samedi 8h-12h";
        }

        // Questions sur les pauses/repos
        if (lowerMessage.Contains("pause") || lowerMessage.Contains("repos") || 
            lowerMessage.Contains("déjeuner") || lowerMessage.Contains("manger"))
        {
            return "**Réglementation des pauses :**\n\n" +
                   "⏱️ **Pause obligatoire** : Toutes les 2 heures de conduite (15 min minimum)\n" +
                   "🍽️ **Pause déjeuner** : 30-60 min recommandée\n" +
                   "🅿️ **Où se garer** : Aires de repos autorisées uniquement\n" +
                   "📱 **Signalez vos pauses** dans l'application\n\n" +
                   "La sécurité avant tout !";
        }

        // Salutations
        if (lowerMessage.Contains("bonjour") || lowerMessage.Contains("salut") || 
            lowerMessage.Contains("coucou") || lowerMessage.Contains("hello"))
        {
            return $"Bonjour ! 👋\n\n" +
                   $"Je suis votre assistant IA personnel TMS.\n\n" +
                   $"**Je peux vous aider avec :**\n" +
                   $"• 📍 Vos trajets en cours\n" +
                   $"• 📦 Vos livraisons\n" +
                   $"• 📋 Les procédures\n" +
                   $"• ⚠️ La sécurité routière\n\n" +
                   $"Posez-moi une question !";
        }

        // Remerciements
        if (lowerMessage.Contains("merci"))
        {
            return "Je vous en prie ! 😊\n\n" +
                   "N'hésitez pas si vous avez d'autres questions. " +
                   "Bonne route et conduisez prudemment ! 🚛";
        }

        // Réponse par défaut intelligente
        return $"Je suis votre assistant IA TMS. 🤖\n\n" +
               $"**Je peux vous aider avec :**\n" +
               $"• 📍 **Vos trajets** : 'Où est ma prochaine livraison ?'\n" +
               $"• 📦 **Vos livraisons** : 'Combien de livraisons me restent-elles ?'\n" +
               $"• ⏰ **Horaires** : 'Quelle est l'heure d'arrivée ?'\n" +
               $"• ⛽ **Carburant** : 'Où faire le plein ?'\n" +
               $"• ⚠️ **Problèmes** : 'J'ai une panne'\n" +
               $"• 📞 **Support** : 'Comment contacter le support ?'\n\n" +
               $"Posez-moi une question précise !";
    }

    public async Task<List<KnowledgeBase>> GetContextAsync(int driverId, string query)
    {
        // Simple keyword-based retrieval (can be enhanced with vector search)
        var keywords = query.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 3)
            .Distinct()
            .ToList();

        var knowledge = await _context.KnowledgeBases
            .Where(k => keywords.Any(kw => k.Content.ToLower().Contains(kw) || 
                                          k.Keywords.Any(k => k.ToLower().Contains(kw))))
            .OrderByDescending(k => keywords.Count(kw => k.Content.ToLower().Contains(kw)))
            .Take(5)
            .ToListAsync();

        _logger.LogInformation($"📚 Retrieved {knowledge.Count} knowledge items for query: {query}");

        return knowledge;
    }

    private async Task<DriverInfo> GetDriverInfoAsync(int driverId)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == driverId);

        if (driver == null)
        {
            return new DriverInfo { IsAvailable = false };
        }

        // Get current trip for this driver
        var currentTrip = await _context.Trips
            .Where(t => t.DriverId == driverId)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(t => t.TripStatus == TripStatus.DeliveryInProgress || 
                                      t.TripStatus == TripStatus.LoadingInProgress ||
                                      t.TripStatus == TripStatus.Accepted);

        var deliveriesCount = 0;
        if (currentTrip != null)
        {
            deliveriesCount = await _context.Deliveries
                .CountAsync(d => d.TripId == currentTrip.Id);
        }

        return new DriverInfo
        {
            IsAvailable = true,
            DriverName = driver.Name ?? string.Empty,
            TripReference = currentTrip?.TripReference ?? "Aucun",
            Status = currentTrip?.TripStatus.ToString() ?? "En attente",
            DeliveriesCount = deliveriesCount
        };
    }

    private string BuildContextText(List<KnowledgeBase> context)
    {
        if (context.Count == 0) return string.Empty;

        var sb = new StringBuilder();
        sb.AppendLine("📚 CONTEXTE DE CONNAISSANCE :");
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
            
            // Fallback: Simple keyword-based response
            return GetFallbackResponse(prompt);
        }
    }

    private string GetFallbackResponse(string prompt)
    {
        var lowerPrompt = prompt.ToLower();

        // Questions sur les livraisons
        if (lowerPrompt.Contains("prochaine livraison") || lowerPrompt.Contains("où est") || lowerPrompt.Contains("livraison"))
        {
            return "Pour connaître votre prochaine livraison, consultez l'onglet 'Mes Trajets' dans l'application. Vous y verrez l'adresse et les détails de chaque livraison.";
        }

        // Questions sur le chargement
        if (lowerPrompt.Contains("chargement") || lowerPrompt.Contains("charger"))
        {
            return "Pour commencer le chargement : 1. Allez dans le détail du trajet, 2. Cliquez sur 'Commencer le chargement', 3. Confirmez l'heure de début. Assurez-vous que le camion est bien positionné au quai de chargement.";
        }

        // Questions sur le temps
        if (lowerPrompt.Contains("heure") || lowerPrompt.Contains("temps") || lowerPrompt.Contains("arrivée"))
        {
            return "L'heure estimée d'arrivée dépend du trafic et de la distance. Consultez l'application pour voir l'estimation en temps réel basée sur votre position actuelle.";
        }

        // Questions sur les livraisons restantes
        if (lowerPrompt.Contains("combien") && (lowerPrompt.Contains("livraison") || lowerPrompt.Contains("reste")))
        {
            return "Le nombre de livraisons restantes est affiché dans l'onglet 'Mes Trajets'. Chaque livraison est marquée comme 'En attente', 'En cours' ou 'Terminée'.";
        }

        // Questions sur le carburant
        if (lowerPrompt.Contains("plein") || lowerPrompt.Contains("carburant") || lowerPrompt.Contains("essence"))
        {
            return "Pour faire le plein, utilisez une station partenaire TMS. Les stations partenaires sont listées dans l'application. Conservez les reçus pour le remboursement.";
        }

        // Questions sur les problèmes
        if (lowerPrompt.Contains("problème") || lowerPrompt.Contains("urgence") || lowerPrompt.Contains("panne"))
        {
            return "En cas de problème (panne, accident, retard) : 1. Mettez-vous en sécurité, 2. Contactez le support TMS au +216 XX XXX XXX, 3. Signalez l'incident dans l'application.";
        }

        // Questions sur le support
        if (lowerPrompt.Contains("support") || lowerPrompt.Contains("contact") || lowerPrompt.Contains("téléphone"))
        {
            return "Pour contacter le support TMS : Téléphone : +216 XX XXX XXX, Email : support@tms.com, Ou via l'application dans la section 'Aide'.";
        }

        // Questions sur les pauses
        if (lowerPrompt.Contains("pause") || lowerPrompt.Contains("repos"))
        {
            return "Les pauses sont obligatoires toutes les 2 heures de conduite (15 min minimum). Planifiez vos pauses aux aires de repos autorisées. Signalez vos pauses dans l'application.";
        }

        // Salutations
        if (lowerPrompt.Contains("bonjour") || lowerPrompt.Contains("salut"))
        {
            return "Bonjour ! Comment puis-je vous aider aujourd'hui ? Posez-moi une question sur vos trajets, livraisons, ou toute autre question.";
        }

        // Remerciements
        if (lowerPrompt.Contains("merci"))
        {
            return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions. Bonne route !";
        }

        // Réponse par défaut
        return "Je suis votre assistant IA TMS. Je peux vous aider avec vos trajets, livraisons, procédures, et questions générales. Posez-moi une question précise !";
    }
}

public class DriverInfo
{
    public bool IsAvailable { get; set; }
    public string DriverName { get; set; } = string.Empty;
    public string TripReference { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int DeliveriesCount { get; set; }
}
