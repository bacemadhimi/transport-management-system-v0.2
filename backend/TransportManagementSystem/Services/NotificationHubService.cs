using Microsoft.AspNetCore.SignalR;
using TransportManagementSystem.Hubs;

namespace TransportManagementSystem.Services;

/// <summary>
/// Service de notification en temps réel pour les chauffeurs
/// </summary>
public interface INotificationHubService
{
    Task SendTripAssignment(int userId, object tripData, int driverId);
    Task SendStatusUpdate(int tripId, string status);
    Task SendToConnection(string connectionId, object data);
}

public class NotificationHubService : INotificationHubService
{
    private readonly IHubContext<NotificationHub> _notificationHub;
    private readonly IHubContext<GPSHub> _gpsHub;
    private readonly ILogger<NotificationHubService> _logger;

    // Store active connections: driverId -> connectionId
    private static readonly Dictionary<int, string> _activeConnections = new();

    public NotificationHubService(
        IHubContext<NotificationHub> notificationHub,
        IHubContext<GPSHub> gpsHub,
        ILogger<NotificationHubService> logger)
    {
        _notificationHub = notificationHub;
        _gpsHub = gpsHub;
        _logger = logger;
    }

    /// <summary>
    /// Register a connection for a driver
    /// </summary>
    public void RegisterConnection(int driverId, string connectionId)
    {
        _activeConnections[driverId] = connectionId;
        _logger.LogInformation($"Driver {driverId} registered with connection {connectionId}");
    }

    /// <summary>
    /// Unregister a connection
    /// </summary>
    public void UnregisterConnection(int driverId)
    {
        if (_activeConnections.ContainsKey(driverId))
        {
            _activeConnections.Remove(driverId);
            _logger.LogInformation($"Driver {driverId} unregistered");
        }
    }

    /// <summary>
    /// Send trip assignment notification to SPECIFIC driver ONLY
    /// </summary>
    public async Task SendTripAssignment(int userId, object tripData, int driverId)
    {
        try
        {
            _logger.LogInformation($"🎯 Sending trip assignment to User ID: {userId}, Driver ID: {driverId}");

            // Send to SPECIFIC USER via NotificationHub (PRIMARY) - using UserId from JWT token
            await _notificationHub.Clients.User(userId.ToString()).SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via NotificationHub to User {userId}");

            // Send to SPECIFIC driver group via GPSHub - using driver-{driverId}
            await _gpsHub.Clients.Group($"driver-{driverId}").SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via GPSHub to group driver-{driverId}");

            // ALSO send to driver_{driverId} group in NotificationHub (alternative naming used by mobile)
            await _notificationHub.Clients.Group($"driver_{driverId}").SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via NotificationHub to group driver_{driverId}");

            // BROADCAST to all clients as fallback (for testing/debugging)
            await _notificationHub.Clients.All.SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Broadcast to ALL clients (fallback)");

            _logger.LogInformation($"🔒 Notification sent to driver {driverId} via multiple channels");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Error sending notification to driver {driverId}");
            throw;
        }
    }

    /// <summary>
    /// Send status update
    /// </summary>
    public async Task SendStatusUpdate(int tripId, string status)
    {
        try
        {
            await _gpsHub.Clients.All.SendAsync("StatusUpdated", new
            {
                TripId = tripId,
                Status = status,
                Timestamp = DateTime.UtcNow
            });
            _logger.LogInformation($"Status update sent for trip {tripId}: {status}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending status update: {ex.Message}");
        }
    }

    /// <summary>
    /// Send to specific connection
    /// </summary>
    public async Task SendToConnection(string connectionId, object data)
    {
        try
        {
            await _gpsHub.Clients.Client(connectionId).SendAsync("Notification", data);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error sending to connection: {ex.Message}");
        }
    }
}
