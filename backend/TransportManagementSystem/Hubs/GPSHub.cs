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
    /// Helper method to create a notification and send it to all admin users.
    /// Creates Notification entity + UserNotification for each admin, sends SignalR to Admins group.
    /// </summary>
    private async Task NotifyAdminsAsync(Notification notification, object signalRData)
    {
        try
        {
            // Save notification to DB first to get its ID
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Get all admin users (by email pattern)
            var allUsers = await _context.Users.ToListAsync();
            var adminUsers = allUsers.Where(u =>
                u.Email != null && (u.Email.Contains("admin") || u.Email.Contains("super"))
            ).Distinct().ToList();

            // Create UserNotification for each admin
            foreach (var adminUser in adminUsers)
            {
                var userNotification = new UserNotification
                {
                    NotificationId = notification.Id,
                    UserId = adminUser.Id,
                    IsRead = false,
                    ReadAt = null
                };
                _context.UserNotifications.Add(userNotification);
            }
            await _context.SaveChangesAsync();

            // Send SignalR notification to Admins group (uppercase - consistent)
            await Clients.Group("Admins").SendAsync("ReceiveNotification", signalRData);

            _logger.LogInformation($"✅ [NotifyAdmins] Notification {notification.Id} sent to {adminUsers.Count} admins via SignalR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ [NotifyAdmins] Failed to notify admins for notification {notification.Id}");
        }
    }

    /// <summary>
    /// Envoyer une position GPS avec throttling
    /// </summary>
    public async Task SendPosition(GPSPositionData data)
    {
        try
        {
            _logger.LogInformation($"📍 Received GPS position: TripId={data.TripId}, DriverId={data.DriverId}, TruckId={data.TruckId}, Lat={data.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}, Lng={data.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}");

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
                    // ✅ FIXED: Always use InvariantCulture to avoid French comma issues
                    trip.CurrentLatitude = data.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    trip.CurrentLongitude = data.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
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

                    _logger.LogInformation($"📡 Broadcast ReceivePosition to Admins group: TripId={trip.Id}, Lat={data.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}, Lng={data.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}");

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

                    _logger.LogInformation($"📡 Broadcast ReceivePosition to AllTrips group: TripId={trip.Id}");
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
                    // ✅ FIXED: Always use InvariantCulture to avoid French comma issues
                    activeTrip.CurrentLatitude = data.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    activeTrip.CurrentLongitude = data.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
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

                    _logger.LogInformation($"📡 Broadcast ReceivePosition to Admins (fallback): TripId={activeTrip.Id}, Lat={data.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}, Lng={data.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}");

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

                    _logger.LogInformation($"📡 Broadcast ReceivePosition to AllTrips (fallback): TripId={activeTrip.Id}");
                }
                else
                {
                    _logger.LogWarning($"⚠️ No active trip found for DriverId={data.DriverId}, TruckId={data.TruckId}");
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
    /// Obtenir toutes les positions actives avec destination complète
    /// </summary>
    public async Task GetActiveTrips()
    {
        try
        {
            var activeTrips = await _context.Trips
                .Where(t => t.TripStatus == TripStatus.InDelivery ||
                           t.TripStatus == TripStatus.Loading ||
                           t.TripStatus == TripStatus.Arrived ||
                           t.TripStatus == TripStatus.Accepted)
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                .ThenInclude(d => d.Location)
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
                    // Destination coordinates - Priority 1: Trip end coordinates
                    DestinationLat = t.EndLatitude,
                    DestinationLng = t.EndLongitude,
                    // Get destination address from last delivery if available
                    Destination = t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault() != null
                        ? t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault().DeliveryAddress
                        : null,
                    // Also include last delivery geolocation if available
                    LastDeliveryGeolocation = t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault() != null
                        ? t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault().Geolocation
                        : null,
                    // Include last delivery location coordinates if available
                    LastDeliveryLocationLat = t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault(d => d.Location != null && d.Location.Latitude.HasValue) != null
                        ? t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault(d => d.Location != null && d.Location.Latitude.HasValue).Location.Latitude
                        : (double?)null,
                    LastDeliveryLocationLng = t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault(d => d.Location != null && d.Location.Latitude.HasValue) != null
                        ? t.Deliveries.OrderByDescending(d => d.Id).FirstOrDefault(d => d.Location != null && d.Location.Latitude.HasValue).Location.Longitude
                        : (double?)null
                })
                .ToListAsync();

            await Clients.Caller.SendAsync("ActiveTrips", activeTrips);
            
            _logger.LogInformation($"📊 GetActiveTrips: Sent {activeTrips.Count} active trips to client {Context.ConnectionId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in GetActiveTrips");
            await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
        }
    }

    /// <summary>
    /// Mettre à jour le statut du trip
    /// </summary>
    public async Task UpdateTripStatus(int tripId, string status, string? notes = null)
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

                // Build status-specific notification data
                string notifType, title, message;
                switch (newStatus)
                {
                    case TripStatus.Loading:
                        notifType = "LOADING_STARTED";
                        title = "📦 Chargement démarré";
                        message = $"Le chauffeur {trip.Driver?.Name} a commencé le chargement pour la mission {trip.TripReference}";
                        break;
                    case TripStatus.InDelivery:
                        notifType = "DELIVERY_STARTED";
                        title = "🚚 Livraison démarrée";
                        message = $"Le chauffeur {trip.Driver?.Name} a commencé la livraison pour la mission {trip.TripReference}";
                        break;
                    case TripStatus.Arrived:
                        notifType = "ARRIVED_AT_DESTINATION";
                        title = "📍 Arrivé à destination";
                        message = $"Le chauffeur {trip.Driver?.Name} est arrivé à destination pour la mission {trip.TripReference}";
                        break;
                    case TripStatus.Completed:
                        notifType = "MISSION_COMPLETED";
                        title = "✅ Mission terminée";
                        message = $"Le chauffeur {trip.Driver?.Name} a terminé la mission {trip.TripReference}";
                        break;
                    default:
                        notifType = "STATUS_CHANGE";
                        title = "🔄 Status changé";
                        message = $"Mission {trip.TripReference}: {oldStatus} → {newStatus}";
                        break;
                }

                var notificationData = new
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
                };

                // Create and persist notification via helper
                var dbNotification = new Notification
                {
                    Type = notifType,
                    Title = title,
                    Message = message,
                    Timestamp = DateTime.UtcNow,
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    OldStatus = oldStatus.ToString(),
                    NewStatus = newStatus.ToString(),
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    AdditionalData = JsonSerializer.Serialize(notificationData),
                    CreatedAt = DateTime.UtcNow
                };

                await NotifyAdminsAsync(dbNotification, new
                {
                    type = notifType,
                    tripId = tripId,
                    tripReference = trip.TripReference,
                    driverId = trip.DriverId,
                    driverName = trip.Driver?.Name,
                    truckImmatriculation = trip.Truck?.Immatriculation,
                    title = title,
                    message = message,
                    oldStatus = oldStatus.ToString(),
                    newStatus = newStatus.ToString(),
                    timestamp = DateTime.UtcNow,
                    notes = notes
                });

                // Also broadcast to AllTrips group for real-time tracking
                await Clients.Group("AllTrips").SendAsync("TripStatusChanged", notificationData);
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
                Timestamp = DateTime.UtcNow,
                NewStatus = "Accepted",
                OldStatus = "Planned"
            };

            // ✅ Envoyer TripStatusChanged pour synchronisation temps réel (mobile ET web)
            await Clients.All.SendAsync("TripStatusChanged", notificationData);
            _logger.LogInformation($"📡 [AcceptTrip] TripStatusChanged broadcasted: {tripId} → Accepted");

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

            // Create and persist notification via helper (sends to Admins group + saves to DB)
            var dbNotification = new Notification
            {
                Type = "TRIP_ACCEPTED",
                Title = "✅ Mission Acceptée",
                Message = $"Le chauffeur {trip.Driver?.Name} a accepté la mission {trip.TripReference}",
                Timestamp = DateTime.UtcNow,
                TripId = tripId,
                TripReference = trip.TripReference,
                NewStatus = "Accepted",
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                AdditionalData = JsonSerializer.Serialize(notificationData),
                CreatedAt = DateTime.UtcNow
            };

            await NotifyAdminsAsync(dbNotification, new
            {
                type = "TRIP_ACCEPTED",
                tripId = tripId,
                tripReference = trip.TripReference,
                driverId = trip.DriverId,
                driverName = trip.Driver?.Name,
                title = "Voyage Accepté",
                message = $"Le chauffeur {trip.Driver?.Name} a accepté le voyage {trip.TripReference}",
                status = "Accepted",
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation($"✅ [AcceptTrip] Notification saved and sent to admins - tripId: {tripId}");
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
                Timestamp = DateTime.UtcNow,
                NewStatus = "Refused",
                OldStatus = "Planned"
            };

            // ✅ Envoyer TripStatusChanged pour synchronisation temps réel (mobile ET web)
            await Clients.All.SendAsync("TripStatusChanged", notificationData);
            _logger.LogInformation($"📡 [RejectTrip] TripStatusChanged broadcasted: {tripId} → Refused");

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

            // Create and persist notification via helper (sends to Admins group + saves to DB)
            var dbNotification = new Notification
            {
                Type = "TRIP_REJECTED",
                Title = "❌ Mission Refusée",
                Message = $"Le chauffeur {trip.Driver?.Name} a refusé la mission {trip.TripReference}. Raison: {reason}",
                Timestamp = DateTime.UtcNow,
                TripId = tripId,
                TripReference = trip.TripReference,
                NewStatus = "Refused",
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                AdditionalData = JsonSerializer.Serialize(notificationData),
                CreatedAt = DateTime.UtcNow
            };

            await NotifyAdminsAsync(dbNotification, new
            {
                type = "TRIP_REJECTED",
                tripId = tripId,
                tripReference = trip.TripReference,
                driverId = trip.DriverId,
                driverName = trip.Driver?.Name,
                truckImmatriculation = trip.Truck?.Immatriculation,
                title = "Voyage Refusé",
                message = $"Le chauffeur {trip.Driver?.Name} a refusé le voyage {trip.TripReference}. Raison: {reason}",
                reason = reason,
                reasonCode = reasonCode,
                status = "Refused",
                timestamp = DateTime.UtcNow
            });

            _logger.LogInformation($"✅ [RejectTrip] Notification saved and sent to admins - tripId: {tripId}");
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
