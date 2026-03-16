using Microsoft.AspNetCore.SignalR;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Hubs;

/// <summary>
/// Hub GPS pour le tracking et les notifications en temps réel
/// </summary>
public class GPSHub : Hub
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GPSHub> _logger;
    private readonly NotificationHubService _notificationService;
    private static readonly ConcurrentDictionary<string, DateTime> _lastPositionTime = new();
    private static readonly TimeSpan _minUpdateInterval = TimeSpan.FromSeconds(5);

    public GPSHub(
        ApplicationDbContext context,
        ILogger<GPSHub> logger,
        NotificationHubService notificationService)
    {
        _context = context;
        _logger = logger;
        _notificationService = notificationService;
    }

    /// <summary>
    /// Envoyer une position GPS avec throttling
    /// </summary>
    public async Task SendPosition(GPSPositionData data)
    {
        try
        {
            // Validation des coordonnées
            if (!IsValidCoordinates(data.Latitude, data.Longitude))
            {
                await Clients.Caller.SendAsync("Error", "Coordonnées GPS invalides");
                return;
            }

            // Throttling - max 1 position / 5 secondes
            var clientId = Context.ConnectionId;
            if (_lastPositionTime.TryGetValue(clientId, out var lastTime) && 
                DateTime.UtcNow - lastTime < _minUpdateInterval)
            {
                return;
            }
            _lastPositionTime[clientId] = DateTime.UtcNow;

            // Sauvegarder la position
            var position = new PositionGPS
            {
                DriverId = data.DriverId,
                TruckId = data.TruckId,
                Latitude = data.Latitude,
                Longitude = data.Longitude,
                Accuracy = data.Accuracy,
                Timestamp = DateTime.UtcNow,
                Source = data.Source ?? "Mobile",
                IsSynchronized = true
            };

            _context.PositionsGPS.Add(position);
            
            // Mettre à jour la position actuelle du trip
            if (data.TripId.HasValue)
            {
                var trip = await _context.Trips.FindAsync(data.TripId.Value);
                if (trip != null)
                {
                    trip.CurrentLatitude = data.Latitude.ToString();
                    trip.CurrentLongitude = data.Longitude.ToString();
                    trip.LastPositionUpdate = DateTime.UtcNow;
                    
                    // Broadcast à tous les admins
                    await Clients.Group("Admins").SendAsync("ReceivePosition", new
                    {
                        tripId = trip.Id,
                        tripReference = trip.TripReference,
                        driverId = trip.DriverId,
                        latitude = data.Latitude,
                        longitude = data.Longitude,
                        timestamp = DateTime.UtcNow,
                        status = trip.TripStatus.ToString()
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Accuser réception
            await Clients.Caller.SendAsync("PositionReceived", new
            {
                Success = true,
                PositionId = position.Id,
                Timestamp = position.Timestamp
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving GPS position");
            await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
        }
    }

    /// <summary>
    /// Rejoindre le suivi d'un trip spécifique
    /// </summary>
    public async Task JoinTripTracking(int tripId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"trip-{tripId}");
        _logger.LogInformation($"Client {Context.ConnectionId} joined trip {tripId} tracking");
    }

    /// <summary>
    /// Quitter le suivi d'un trip
    /// </summary>
    public async Task LeaveTripTracking(int tripId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"trip-{tripId}");
    }

    /// <summary>
    /// Rejoindre le groupe Admins
    /// </summary>
    public async Task JoinAdminGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        _logger.LogInformation($"Admin {Context.ConnectionId} joined Admins group");
    }

    /// <summary>
    /// Rejoindre le groupe Drivers
    /// </summary>
    public async Task JoinDriverGroup(int driverId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"driver-{driverId}");
        _logger.LogInformation($"Driver {driverId} joined driver-{driverId} group");
    }

    /// <summary>
    /// Obtenir toutes les positions actives
    /// </summary>
    public async Task GetActiveTrips()
    {
        var activeTrips = await _context.Trips
            .Where(t => t.TripStatus == TripStatus.InDelivery || 
                       t.TripStatus == TripStatus.Loading ||
                       t.TripStatus == TripStatus.Arrived ||
                       t.TripStatus == TripStatus.Accepted)
            .Include(t => t.Driver)
            .Include(t => t.Truck)
            .Include(t => t.Deliveries)
            .Select(t => new
            {
                t.Id,
                t.TripReference,
                Status = t.TripStatus.ToString(),
                DriverName = t.Driver != null ? t.Driver.Name : null,
                TruckImmatriculation = t.Truck != null ? t.Truck.Immatriculation : null,
                CurrentLatitude = t.CurrentLatitude != null ? double.Parse(t.CurrentLatitude) : (double?)null,
                CurrentLongitude = t.CurrentLongitude != null ? double.Parse(t.CurrentLongitude) : (double?)null,
                LastPositionUpdate = t.LastPositionUpdate,
                DeliveriesCount = t.Deliveries.Count,
                EstimatedDistance = t.EstimatedDistance,
                EstimatedDuration = t.EstimatedDuration
            })
            .ToListAsync();

        await Clients.Caller.SendAsync("ActiveTrips", activeTrips);
    }

    /// <summary>
    /// Mettre à jour le statut du trip
    /// </summary>
    public async Task UpdateTripStatus(int tripId, string status, string? notes = null)
    {
        try
        {
            var trip = await _context.Trips.FindAsync(tripId);
            if (trip == null)
            {
                await Clients.Caller.SendAsync("Error", "Trip non trouvé");
                return;
            }

            if (Enum.TryParse<TripStatus>(status, out var newStatus))
            {
                var oldStatus = trip.TripStatus;
                trip.TripStatus = newStatus;
                
                switch (newStatus)
                {
                    case TripStatus.Loading:
                        trip.ActualStartDate = DateTime.UtcNow;
                        break;
                    case TripStatus.Completed:
                        trip.ActualEndDate = DateTime.UtcNow;
                        break;
                }

                await _context.SaveChangesAsync();

                // Notifier tous les clients du groupe
                await Clients.Group($"trip-{tripId}").SendAsync("StatusUpdated", new
                {
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    OldStatus = oldStatus.ToString(),
                    NewStatus = newStatus.ToString(),
                    Timestamp = DateTime.UtcNow,
                    Notes = notes
                });

                // Broadcast à tous les admins
                await Clients.Group("Admins").SendAsync("TripStatusChanged", new
                {
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    Status = newStatus.ToString(),
                    Timestamp = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating trip status");
            await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
        }
    }

    /// <summary>
    /// Accepter le trip
    /// </summary>
    public async Task AcceptTrip(int tripId)
    {
        await UpdateTripStatus(tripId, TripStatus.Accepted.ToString(), "Trip accepté");
        
        // Mettre à jour l'assignment
        var assignment = await _context.TripAssignments
            .Where(a => a.TripId == tripId)
            .OrderByDescending(a => a.AssignedAt)
            .FirstOrDefaultAsync();
        
        if (assignment != null)
        {
            assignment.Status = AssignmentStatus.Accepted;
            assignment.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            // Notifier les admins
            await Clients.Group("Admins").SendAsync("TripAccepted", new
            {
                TripId = tripId,
                TripReference = assignment.Trip?.TripReference,
                DriverId = assignment.DriverId,
                Timestamp = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Refuser le trip
    /// </summary>
    public async Task RejectTrip(int tripId, string reason, string reasonCode)
    {
        await UpdateTripStatus(tripId, TripStatus.Refused.ToString(), reason);
        
        var assignment = await _context.TripAssignments
            .Where(a => a.TripId == tripId)
            .OrderByDescending(a => a.AssignedAt)
            .FirstOrDefaultAsync();
        
        if (assignment != null)
        {
            assignment.Status = AssignmentStatus.Rejected;
            assignment.RejectionReason = reason;
            assignment.RejectionReasonCode = reasonCode;
            assignment.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            // Notifier les admins
            await Clients.Group("Admins").SendAsync("TripRejected", new
            {
                TripId = tripId,
                TripReference = assignment.Trip?.TripReference,
                DriverId = assignment.DriverId,
                Reason = reason,
                ReasonCode = reasonCode,
                Timestamp = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Démarrer le chargement
    /// </summary>
    public async Task StartLoading(int tripId)
    {
        await UpdateTripStatus(tripId, TripStatus.Loading.ToString(), "Chargement démarré");
    }

    /// <summary>
    /// Démarrer la livraison
    /// </summary>
    public async Task StartDelivery(int tripId)
    {
        await UpdateTripStatus(tripId, TripStatus.InDelivery.ToString(), "Livraison démarrée");
    }

    /// <summary>
    /// Arrivé à destination
    /// </summary>
    public async Task ArrivedAtDestination(int tripId)
    {
        await UpdateTripStatus(tripId, TripStatus.Arrived.ToString(), "Arrivé à destination");
    }

    /// <summary>
    /// Compléter le trip
    /// </summary>
    public async Task CompleteTrip(int tripId)
    {
        await UpdateTripStatus(tripId, TripStatus.Completed.ToString(), "Livraison terminée");
    }

    /// <summary>
    /// Envoyer une notification de nouveau trip à un chauffeur
    /// </summary>
    public async Task SendTripAssignment(int driverId, object tripData)
    {
        try
        {
            // Envoyer au driver spécifique
            await Clients.User(driverId.ToString()).SendAsync("NewTripAssigned", tripData);
            
            // Envoyer aussi au groupe du driver
            await Clients.Group($"driver-{driverId}").SendAsync("NewTripAssigned", tripData);
            
            _logger.LogInformation($"Sent trip assignment to driver {driverId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending trip assignment to driver {driverId}");
        }
    }

    private bool IsValidCoordinates(double latitude, double longitude)
    {
        return latitude >= -90 && latitude <= 90 &&
               longitude >= -180 && longitude <= 180;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation($"GPS Client connected: {Context.ConnectionId}");

        // Auto-join Admins group for all connections
        await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");

        // Try to get driver ID from JWT claims - check multiple possible claim types
        var userIdClaim = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var driverIdClaim = Context.User?.FindFirst("driverId")?.Value;
        var roleClaim = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        _logger.LogInformation($"GPS Client claims - UserId: {userIdClaim}, DriverId: {driverIdClaim}, Role: {roleClaim}");

        // If user is a driver, use their user ID as driver ID
        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userIdInt))
        {
            // For drivers, the user ID is the driver ID
            if (roleClaim == "Driver")
            {
                _notificationService.RegisterConnection(userIdInt, Context.ConnectionId);
                await Groups.AddToGroupAsync(Context.ConnectionId, $"driver-{userIdInt}");
                _logger.LogInformation($"✅ Driver {userIdInt} registered with connection {Context.ConnectionId}");
            }
            else
            {
                // For admins, just log the connection
                _logger.LogInformation($"✅ Admin user {userIdInt} connected");
            }
        }
        else if (!string.IsNullOrEmpty(driverIdClaim) && int.TryParse(driverIdClaim, out int driverIdInt))
        {
            // Fallback to driverId claim if available
            _notificationService.RegisterConnection(driverIdInt, Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, $"driver-{driverIdInt}");
            _logger.LogInformation($"✅ Driver {driverIdInt} registered with connection {Context.ConnectionId}");
        }
        else
        {
            _logger.LogWarning($"⚠️ No driverId/userId claim found. Claims: {string.Join(", ", Context.User?.Claims.Select(c => $"{c.Type}={c.Value}") ?? new string[0])}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _lastPositionTime.TryRemove(Context.ConnectionId, out _);
        
        // Unregister connection
        var driverIdClaim = Context.User?.FindFirst("driverId")?.Value 
                          ?? Context.User?.FindFirst("userId")?.Value;
        
        if (!string.IsNullOrEmpty(driverIdClaim) && int.TryParse(driverIdClaim, out int driverIdInt))
        {
            _notificationService.UnregisterConnection(driverIdInt);
        }
        
        _logger.LogInformation($"GPS Client disconnected: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}

public class GPSPositionData
{
    public int? DriverId { get; set; }
    public int? TruckId { get; set; }
    public int? TripId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Accuracy { get; set; }
    public string? Source { get; set; }
}
