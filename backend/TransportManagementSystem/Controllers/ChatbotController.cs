using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TransportManagementSystem.Models;
using TransportManagementSystem.Models.AI;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatbotController : ControllerBase
{
    private readonly IChatbotService _chatbotService;
    private readonly AiMicroserviceClient _aiMicroserviceClient;
    private readonly ILogger<ChatbotController> _logger;

    public ChatbotController(
        IChatbotService chatbotService,
        AiMicroserviceClient aiMicroserviceClient,
        ILogger<ChatbotController> logger)
    {
        _chatbotService = chatbotService;
        _aiMicroserviceClient = aiMicroserviceClient;
        _logger = logger;
    }

    /// <summary>
    /// Send a message to the AI chatbot
    /// </summary>
    [HttpPost("message")]
    public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
    {
        try
        {
            // Log incoming request
            _logger.LogInformation($"📥 Chatbot API - Incoming request: DriverId={request?.DriverId}, Message={request?.Message}");

            // Get driver ID from JWT token if not provided
            if (request.DriverId == 0)
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var driverIdClaim = User.FindFirst("driverId")?.Value;
                var emailClaim = User.FindFirst(ClaimTypes.Email)?.Value;

                _logger.LogInformation($"🔑 JWT Claims - UserId: {userIdClaim}, DriverId: {driverIdClaim}, Email: {emailClaim}");

                // Try multiple ways to get driver ID
                if (int.TryParse(driverIdClaim, out int driverIdFromClaim))
                {
                    request.DriverId = driverIdFromClaim;
                    _logger.LogInformation($"✅ Using driverId from JWT driverId claim: {request.DriverId}");
                }
                else if (int.TryParse(userIdClaim, out int userId))
                {
                    request.DriverId = userId;
                    _logger.LogInformation($"✅ Using driverId from JWT userId claim: {request.DriverId}");
                }
                else
                {
                    _logger.LogWarning("⚠️ Could not extract driver ID from JWT token");
                    return Unauthorized(new { message = "Driver ID required" });
                }
            }

            _logger.LogInformation($"💬 Chat message from driver {request.DriverId}: {request.Message}");

            // ===== DeliveryBrain v2.0: Essayer le microservice IA enrichi en premier =====
            var aiRequest = BuildAiRequest(request);
            var aiResponse = await _aiMicroserviceClient.GetChatResponseAsync(aiRequest);
            if (aiResponse != null)
            {
                _logger.LogInformation("🧠 DeliveryBrain v2.0 response: hasAnomaly={HasAnomaly}", aiResponse.HasAnomaly);
                return Ok(new ApiResponse(true, "Message sent (DeliveryBrain v2.0)", aiResponse));
            }
            // Si null → fallback vers le chatbot existant (Ollama direct)

            var response = await _chatbotService.GetResponseAsync(request);

            _logger.LogInformation($"🤖 Chatbot response: Source={response.Source}, IsConfident={response.IsConfident}");

            return Ok(new ApiResponse(true, "Message sent", response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending chat message");
            return StatusCode(500, new ApiResponse(false, "Error sending message"));
        }
    }

    /// <summary>
    /// Get chatbot conversation history for a driver
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int driverId))
            {
                return Unauthorized(new { message = "Driver ID required" });
            }

            // TODO: Implement conversation history storage
            var history = new List<ChatBotMessage>();

            return Ok(new ApiResponse(true, "History retrieved", history));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting chat history");
            return StatusCode(500, new ApiResponse(false, "Error getting history"));
        }
    }

    /// <summary>
    /// Get suggested questions for the chatbot
    /// </summary>
    [HttpGet("suggestions")]
    public IActionResult GetSuggestions()
    {
        var suggestions = new List<string>
        {
            "📍 Où est ma prochaine livraison ?",
            "🚛 Comment commencer le chargement ?",
            "⏰ Quelle est l'heure estimée d'arrivée ?",
            "📦 Combien de livraisons me restent-elles ?",
            "⛽ Où faire le plein près de moi ?",
            "🛑 Que faire en cas de problème ?",
            "📞 Comment contacter le support ?",
            "🕐 Quand est ma pause ?"
        };

        return Ok(new ApiResponse(true, "Suggestions retrieved", suggestions));
    }

    /// <summary>
    /// Construit une requête enrichie pour DeliveryBrain v2.0 à partir de la requête chat existante.
    /// Cette méthode adapte les paramètres disponibles au format attendu par le microservice IA.
    /// </summary>
    private ChatAiRequest BuildAiRequest(ChatRequest request)
    {
        return new ChatAiRequest
        {
            Question = request.Message,
            DriverId = request.DriverId,
            Lat = 36.8065,  // Centre Tunis par défaut — sera ajusté par le mobile
            Lon = 10.1815,
            Hour = DateTime.Now.Hour,
            Zone = "centre",
            RemainingDeliveries = 0,  // Sera enrichi par le mobile
            CurrentDelayMinutes = 0,
            ObservedSpeedKmh = 50,
            StopIds = new List<int>(),
            RecentGpsPoints = new List<GpsPointDto>()
        };
    }
}
