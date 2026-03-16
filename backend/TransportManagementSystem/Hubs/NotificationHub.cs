using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Hubs;

/// <summary>
/// Hub SignalR pour les notifications en temps réel
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;
    private readonly NotificationHubService _notificationHubService;

    public NotificationHub(
        ILogger<NotificationHub> logger,
        NotificationHubService notificationHubService)
    {
        _logger = logger;
        _notificationHubService = notificationHubService;
    }

    /// <summary>
    /// Joindre le groupe d'un chauffeur spécifique
    /// </summary>
    public async Task JoinDriverGroup(int driverId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"driver_{driverId}");
        _logger.LogInformation($"Driver {driverId} joined notification group");
    }

    /// <summary>
    /// Quitter le groupe d'un chauffeur
    /// </summary>
    public async Task LeaveDriverGroup(int driverId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"driver_{driverId}");
        _logger.LogInformation($"Driver {driverId} left notification group");
    }

    public override async Task OnConnectedAsync()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var roleClaim = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

        _logger.LogInformation($"NotificationHub Client connected: {Context.ConnectionId}, UserId: {userIdClaim}, Role: {roleClaim}");

        // Auto-join driver group if user is a driver
        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userIdInt))
        {
            if (roleClaim == "Driver")
            {
                // Register connection
                _notificationHubService.RegisterConnection(userIdInt, Context.ConnectionId);
                await Groups.AddToGroupAsync(Context.ConnectionId, $"driver_{userIdInt}");
                _logger.LogInformation($"✅ Driver {userIdInt} registered in NotificationHub");
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userIdInt))
        {
            _notificationHubService.UnregisterConnection(userIdInt);
        }

        _logger.LogInformation($"NotificationHub Client disconnected: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}
