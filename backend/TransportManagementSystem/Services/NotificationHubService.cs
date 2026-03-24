using Microsoft.AspNetCore.SignalR;
using TransportManagementSystem.Hubs;

namespace TransportManagementSystem.Services;

/// <summary>
/// Service de notification en temps réel pour les chauffeurs
/// </summary>
public interface INotificationHubService
{
    Task SendTripAssignment(int driverId, object tripData);
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
    public async Task SendTripAssignment(int driverId, object tripData)
    {
        try
        {
            _logger.LogInformation($"🎯 Sending trip assignment to SPECIFIC Driver ID: {driverId}");

            // Send to SPECIFIC USER via NotificationHub (PRIMARY)
            await _notificationHub.Clients.User(driverId.ToString()).SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via NotificationHub to User {driverId}");

            // Send to SPECIFIC driver group via GPSHub
            await _gpsHub.Clients.Group($"driver-{driverId}").SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via GPSHub to group driver-{driverId}");

            _logger.LogInformation($"🔒 Notification sent ONLY to driver {driverId}");
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
