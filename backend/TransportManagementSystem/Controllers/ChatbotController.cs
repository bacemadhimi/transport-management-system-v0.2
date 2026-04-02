using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TransportManagementSystem.Models;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatbotController : ControllerBase
{
    private readonly IChatbotService _chatbotService;
    private readonly ILogger<ChatbotController> _logger;

    public ChatbotController(
        IChatbotService chatbotService,
        ILogger<ChatbotController> logger)
    {
        _chatbotService = chatbotService;
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
            // Get driver ID from JWT token if not provided
            if (request.DriverId == 0)
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (int.TryParse(userIdClaim, out int userId))
                {
                    request.DriverId = userId;
                }
                else
                {
                    return Unauthorized(new { message = "Driver ID required" });
                }
            }

            _logger.LogInformation($"💬 Chat message from driver {request.DriverId}: {request.Message}");

            var response = await _chatbotService.GetResponseAsync(request);

            _logger.LogInformation($"🤖 Chatbot response: {response.Message}");

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
            var history = new List<ChatMessage>();

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
}
