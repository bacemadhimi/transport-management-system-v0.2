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
            _logger.LogInformation($"🎯 ========== START SendTripAssignment ==========");
            _logger.LogInformation($"🎯 UserId: {userId}, DriverId: {driverId}");
            _logger.LogInformation($"🎯 Active connections: {_activeConnections.Count}");
            foreach (var kvp in _activeConnections)
            {
                _logger.LogInformation($"   - Driver {kvp.Key} -> Connection {kvp.Value}");
            }

            // 1️⃣ Send to driver_{driverId} group in NotificationHub (mobile joins this group on connect)
            await _notificationHub.Clients.Group($"driver_{driverId}").SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via NotificationHub group driver_{driverId}");

            // 2️⃣ Send to driver-{driverId} group via GPSHub (mobile joins this group on connect)
            await _gpsHub.Clients.Group($"driver-{driverId}").SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via GPSHub group driver-{driverId}");

            // 3️⃣ Send directly to registered connection if available
            if (_activeConnections.TryGetValue(driverId, out var connectionId))
            {
                await _gpsHub.Clients.Client(connectionId).SendAsync("NewTripAssigned", tripData);
                _logger.LogInformation($"✅ Sent directly to driver {driverId} connection {connectionId}");
            }
            else
            {
                _logger.LogWarning($"⚠️ No active connection found for driver {driverId} in _activeConnections");
            }

            // 4️⃣ Also send via User (uses NameIdentifier claim from JWT)
            await _notificationHub.Clients.User(userId.ToString()).SendAsync("NewTripAssigned", tripData);
            _logger.LogInformation($"✅ Sent via NotificationHub.Clients.User({userId})");

            _logger.LogInformation($"🔒 ========== END: Notification sent to driver {driverId} ONLY ==========");
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
