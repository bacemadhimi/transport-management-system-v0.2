using Microsoft.AspNetCore.SignalR;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using TransportManagementSystem.Services;
using System.Text.Json;

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

                    // Broadcast à tous les admins avec tripId explicite
                    await Clients.Group("Admins").SendAsync("ReceivePosition", new
                    {
                        tripId = trip.Id,
                        tripReference = trip.TripReference,
                        driverId = trip.DriverId,
                        truckId = trip.TruckId,
                        latitude = data.Latitude,
                        longitude = data.Longitude,
                        timestamp = DateTime.UtcNow,
                        status = trip.TripStatus.ToString()
                    });
                    
                    // Aussi broadcast au groupe AllTrips pour le tracking
                    await Clients.Group("AllTrips").SendAsync("ReceivePosition", new
                    {
                        tripId = trip.Id,
                        tripReference = trip.TripReference,
                        driverId = trip.DriverId,
                        truckId = trip.TruckId,
                        latitude = data.Latitude,
                        longitude = data.Longitude,
                        timestamp = DateTime.UtcNow,
                        status = trip.TripStatus.ToString()
                    });
                }
            }
            else if (data.DriverId.HasValue || data.TruckId.HasValue)
            {
                // Si pas de tripId mais driverId/truckId, trouver le trip actif
                var activeTrip = await _context.Trips
                    .Where(t => (t.DriverId == data.DriverId || t.TruckId == data.TruckId) && 
                               (t.TripStatus == TripStatus.InDelivery || 
                                t.TripStatus == TripStatus.Loading || 
                                t.TripStatus == TripStatus.Arrived ||
                                t.TripStatus == TripStatus.Accepted))
                    .FirstOrDefaultAsync();
                
                if (activeTrip != null)
                {
                    activeTrip.CurrentLatitude = data.Latitude.ToString();
                    activeTrip.CurrentLongitude = data.Longitude.ToString();
                    activeTrip.LastPositionUpdate = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    // Broadcast avec le tripId trouvé
                    await Clients.Group("Admins").SendAsync("ReceivePosition", new
                    {
                        tripId = activeTrip.Id,
                        tripReference = activeTrip.TripReference,
                        driverId = activeTrip.DriverId,
                        truckId = activeTrip.TruckId,
                        latitude = data.Latitude,
                        longitude = data.Longitude,
                        timestamp = DateTime.UtcNow,
                        status = activeTrip.TripStatus.ToString()
                    });
                    
                    await Clients.Group("AllTrips").SendAsync("ReceivePosition", new
                    {
                        tripId = activeTrip.Id,
                        tripReference = activeTrip.TripReference,
                        driverId = activeTrip.DriverId,
                        truckId = activeTrip.TruckId,
                        latitude = data.Latitude,
                        longitude = data.Longitude,
                        timestamp = DateTime.UtcNow,
                        status = activeTrip.TripStatus.ToString()
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
    /// Rejoindre le groupe Tous les Trips (pour web admin)
    /// </summary>
    public async Task JoinAllTripsGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "AllTrips");
        _logger.LogInformation($"Client {Context.ConnectionId} joined AllTrips group");
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
                DriverPhone = t.Driver != null ? t.Driver.PhoneNumber : null,
                TruckImmatriculation = t.Truck != null ? t.Truck.Immatriculation : null,
                CurrentLatitude = t.CurrentLatitude != null ? double.Parse(t.CurrentLatitude) : (double?)null,
                CurrentLongitude = t.CurrentLongitude != null ? double.Parse(t.CurrentLongitude) : (double?)null,
                LastPositionUpdate = t.LastPositionUpdate,
                DeliveriesCount = t.Deliveries.Count,
                EstimatedDistance = t.EstimatedDistance,
                EstimatedDuration = t.EstimatedDuration,
                // Destination coordinates
                DestinationLat = t.EndLatitude,
                DestinationLng = t.EndLongitude,
                // Get destination address from last delivery if available
                Destination = t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault() != null 
                    ? t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault().DeliveryAddress 
                    : null
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

                // Broadcast à tous les admins avec détails complets
                await Clients.Group("Admins").SendAsync("TripStatusChanged", new
                {
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    DriverId = trip.DriverId,
                    DriverName = trip.Driver?.Name,
                    TruckId = trip.TruckId,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    OldStatus = oldStatus.ToString(),
                    NewStatus = newStatus.ToString(),
                    CurrentLatitude = trip.CurrentLatitude != null ? double.Parse(trip.CurrentLatitude) : (double?)null,
                    CurrentLongitude = trip.CurrentLongitude != null ? double.Parse(trip.CurrentLongitude) : (double?)null,
                    DestinationLat = trip.EndLatitude,
                    DestinationLng = trip.EndLongitude,
                    Timestamp = DateTime.UtcNow,
                    Notes = notes
                });
                
                // Aussi broadcast au groupe AllTrips
                await Clients.Group("AllTrips").SendAsync("TripStatusChanged", new
                {
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    DriverId = trip.DriverId,
                    DriverName = trip.Driver?.Name,
                    TruckId = trip.TruckId,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    OldStatus = oldStatus.ToString(),
                    NewStatus = newStatus.ToString(),
                    CurrentLatitude = trip.CurrentLatitude != null ? double.Parse(trip.CurrentLatitude) : (double?)null,
                    CurrentLongitude = trip.CurrentLongitude != null ? double.Parse(trip.CurrentLongitude) : (double?)null,
                    DestinationLat = trip.EndLatitude,
                    DestinationLng = trip.EndLongitude,
                    Timestamp = DateTime.UtcNow,
                    Notes = notes
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
        try
        {
            _logger.LogInformation($"🔔 [AcceptTrip] START - tripId: {tripId}");
            
            var trip = await _context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                .FirstOrDefaultAsync(t => t.Id == tripId);

            if (trip == null)
            {
                _logger.LogWarning($"⚠️ [AcceptTrip] Trip {tripId} not found");
                await Clients.Caller.SendAsync("Error", "Trip non trouvé");
                return;
            }

            _logger.LogInformation($"🔔 [AcceptTrip] Trip found: {trip.TripReference}, Driver: {trip.Driver?.Name}");

            trip.TripStatus = TripStatus.Accepted;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"🔔 [AcceptTrip] Trip status updated to Accepted");

            var notificationData = new
            {
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverId = trip.DriverId,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                Status = "Acceptée",
                Timestamp = DateTime.UtcNow
            };

            // Send via SignalR to Admins group (GPSHub) - USE ReceiveNotification event!
            _logger.LogInformation($"🔔 [AcceptTrip] Sending ReceiveNotification to Admins group (GPSHub)...");
            await Clients.Group("admins").SendAsync("ReceiveNotification", new
            {
                type = "TRIP_UPDATE",
                tripId = tripId,
                tripReference = trip.TripReference,
                driverId = trip.DriverId,
                driverName = trip.Driver?.Name,
                title = "Voyage Accepté",
                message = $"Le chauffeur {trip.Driver?.Name} a accepté le voyage {trip.TripReference}",
                status = "Accepted",
                timestamp = DateTime.UtcNow
            });
            _logger.LogInformation($"✅ [AcceptTrip] ReceiveNotification sent to Admins group (GPSHub)!");

            // ALSO send TripAccepted event for web compatibility (like sauvegarde-gps branch)
            await Clients.All.SendAsync("TripAccepted", new
            {
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverId = trip.DriverId,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                Status = "Accepted",
                Timestamp = DateTime.UtcNow
            });
            _logger.LogInformation($"✅ [AcceptTrip] TripAccepted sent to all clients!");

            // ALSO send via NotificationHub for web admin - USE ReceiveNotification event!
            _logger.LogInformation($"🔔 [AcceptTrip] Sending ReceiveNotification via NotificationHub...");
            await Clients.All.SendAsync("ReceiveNotification", new
            {
                type = "TRIP_UPDATE",
                tripId = tripId,
                tripReference = trip.TripReference,
                driverId = trip.DriverId,
                driverName = trip.Driver?.Name,
                title = "Voyage Accepté",
                message = $"Le chauffeur {trip.Driver?.Name} a accepté le voyage {trip.TripReference}",
                status = "Accepted",
                timestamp = DateTime.UtcNow
            });
            _logger.LogInformation($"✅ [AcceptTrip] ReceiveNotification sent via NotificationHub!");

            // Also save to database
            var dbNotification = new Notification
            {
                Type = "TRIP_ACCEPTED",
                Title = "✅ Mission Acceptée",
                Message = $"Le chauffeur {trip.Driver?.Name} a accepté la mission {trip.TripReference}",
                Timestamp = DateTime.UtcNow,
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                AdditionalData = System.Text.Json.JsonSerializer.Serialize(notificationData),
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(dbNotification);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"✅ [AcceptTrip] Notification saved to DB: {dbNotification.Id}");
            _logger.LogInformation($"✅ [AcceptTrip] COMPLETE - tripId: {tripId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ [AcceptTrip] ERROR - {ex.Message}");
            await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
        }
    }

    /// <summary>
    /// Refuser le trip
    /// </summary>
    public async Task RejectTrip(int tripId, string reason, string reasonCode)
    {
        try
        {
            var trip = await _context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .FirstOrDefaultAsync(t => t.Id == tripId);

            if (trip == null)
            {
                await Clients.Caller.SendAsync("Error", "Trip non trouvé");
                return;
            }

            var assignment = await _context.TripAssignments
                .Where(a => a.TripId == tripId)
                .OrderByDescending(a => a.AssignedAt)
                .FirstOrDefaultAsync();

            if (assignment == null)
            {
                assignment = new TripAssignment
                {
                    TripId = tripId,
                    DriverId = trip.DriverId,
                    Status = AssignmentStatus.Pending,
                    AssignedAt = DateTime.UtcNow,
                    NotificationSent = true
                };
                _context.TripAssignments.Add(assignment);
                await _context.SaveChangesAsync();
            }

            assignment.Status = AssignmentStatus.Rejected;
            assignment.RejectionReason = reason;
            assignment.RejectionReasonCode = reasonCode;
            assignment.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            trip.TripStatus = TripStatus.Refused;
            await _context.SaveChangesAsync();

            var notificationData = new
            {
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverId = trip.DriverId,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                Reason = reason,
                ReasonCode = reasonCode,
                Status = "Refusée",
                Timestamp = DateTime.UtcNow
            };

            // Send via SignalR to Admins group (GPSHub) - USE TripStatusChanged event!
            _logger.LogInformation($"🔔 [RejectTrip] Sending TripStatusChanged to Admins group (GPSHub)...");
            await Clients.Group("Admins").SendAsync("TripStatusChanged", new
            {
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverId = trip.DriverId,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                NewStatus = "Refused",
                PreviousStatus = "Assigned",
                Reason = reason,
                ReasonCode = reasonCode,
                Timestamp = DateTime.UtcNow
            });
            _logger.LogInformation($"✅ [RejectTrip] TripStatusChanged sent to Admins group (GPSHub)!");

            // ALSO send TripRejected event for web compatibility (like sauvegarde-gps branch)
            await Clients.All.SendAsync("TripRejected", new
            {
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverId = trip.DriverId,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                Reason = reason,
                ReasonCode = reasonCode,
                Status = "Refused",
                Timestamp = DateTime.UtcNow
            });
            _logger.LogInformation($"✅ [RejectTrip] TripRejected sent to all clients!");

            // ALSO send via NotificationHub for web admin - USE TripStatusChanged event!
            _logger.LogInformation($"🔔 [RejectTrip] Sending TripStatusChanged via NotificationHub...");
            await Clients.All.SendAsync("TripStatusChanged", new
            {
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverId = trip.DriverId,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                NewStatus = "Refused",
                PreviousStatus = "Assigned",
                Reason = reason,
                ReasonCode = reasonCode,
                Timestamp = DateTime.UtcNow
            });
            _logger.LogInformation($"✅ [RejectTrip] TripStatusChanged sent via NotificationHub!");

            // Also save to database for all admins
            var allUsers = await _context.Users.ToListAsync();
            var adminUsers = allUsers.Where(u => u.Email.Contains("admin") || u.Email.Contains("super")).ToList();

            foreach (var adminUser in adminUsers)
            {
                var dbNotification = new Notification
                {
                    Type = "TRIP_CANCELLED", // Use TRIP_CANCELLED for consistency with existing notifications
                    Title = "❌ Mission Refusée",
                    Message = $"Le chauffeur {trip.Driver?.Name} a refusé la mission {trip.TripReference}. Raison: {reason}",
                    Timestamp = DateTime.UtcNow,
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    AdditionalData = System.Text.Json.JsonSerializer.Serialize(notificationData),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Notifications.Add(dbNotification);

                var userNotification = new UserNotification
                {
                    NotificationId = dbNotification.Id,
                    UserId = adminUser.Id,
                    IsRead = false,
                    ReadAt = null
                };

                _context.UserNotifications.Add(userNotification);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation($"✅ Notification saved to DB for {adminUsers.Count} admins");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ ERROR in RejectTrip");
            await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
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

        // Auto-join BOTH Admins and AllTrips groups for all connections
        await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        await Groups.AddToGroupAsync(Context.ConnectionId, "AllTrips");
        
        _logger.LogInformation($"✅ Client {Context.ConnectionId} auto-joined Admins and AllTrips groups");

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
