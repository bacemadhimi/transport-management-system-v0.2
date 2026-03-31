using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Hubs;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripAssignmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<GPSHub> _gpsHub;
    private readonly ILogger<TripAssignmentsController> _logger;

    public TripAssignmentsController(
        ApplicationDbContext context,
        IHubContext<GPSHub> gpsHub,
        ILogger<TripAssignmentsController> logger)
    {
        _context = context;
        _gpsHub = gpsHub;
        _logger = logger;
    }

    /// <summary>
    /// Assigner un trip à un chauffeur avec notification en temps réel
    /// </summary>
    [HttpPost("assign")]
    public async Task<IActionResult> AssignTrip([FromBody] AssignTripRequest request)
    {
        try
        {
            _logger.LogInformation($"📢 START AssignTrip - TripId: {request.TripId}, DriverId: {request.DriverId}");

            var trip = await _context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                    .ThenInclude(d => d.Customer)
                .FirstOrDefaultAsync(t => t.Id == request.TripId);

            if (trip == null)
                return NotFound(new { message = "Trip non trouvé" });

<<<<<<< HEAD
            var driver = await _context.Drivers.FindAsync(request.DriverId);
=======
            var driver = await _context.Set<Driver>().FindAsync(request.DriverId);
>>>>>>> dev
            if (driver == null)
                return NotFound(new { message = "Chauffeur non trouvé" });

            // Créer l'assignment
            var assignment = new TripAssignment
            {
                TripId = request.TripId,
                DriverId = request.DriverId,
                Status = AssignmentStatus.Pending,
                AssignedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(2),
                NotificationSent = false
            };

            _context.TripAssignments.Add(assignment);

            // Mettre à jour le trip
            trip.IsAssigned = true;
            trip.AssignedAt = DateTime.UtcNow;
            trip.TripStatus = TripStatus.Assigned;
            trip.DriverId = request.DriverId;

            await _context.SaveChangesAsync();

            // Find the User ID associated with this Driver (by matching Email)
            var driverUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == driver.Email);
            
            int userIdForNotification = driverUser?.Id ?? request.DriverId;
            _logger.LogInformation($"🔍 Driver {request.DriverId} ({driver.Email}) -> User ID: {userIdForNotification}");

            // Obtenir la destination
            var destination = trip.Deliveries.LastOrDefault()?.DeliveryAddress ?? "Non définie";
            var destinationCoords = await GeocodeAddress(destination);

            // Créer la notification complète
            var notification = new
            {
                type = "NEW_TRIP_ASSIGNMENT",
                title = "Nouvelle Mission",
                message = $"Vous avez été assigné au trip {trip.TripReference}",
                tripId = trip.Id,
                tripReference = trip.TripReference,
                assignmentId = assignment.Id,
                destination = destination,
                destinationLatitude = destinationCoords?.lat,
                destinationLongitude = destinationCoords?.lng,
                estimatedDistance = trip.EstimatedDistance,
                estimatedDuration = trip.EstimatedDuration,
                expiresAt = assignment.ExpiresAt,
                timestamp = DateTime.UtcNow,
                truckImmatriculation = trip.Truck?.Immatriculation,
                driverName = driver.Name,
                deliveriesCount = trip.Deliveries.Count,
                customerName = trip.Deliveries.FirstOrDefault()?.Customer?.Name
            };

            _logger.LogInformation($"📨 Sending notification to User ID {userIdForNotification} and group driver-{request.DriverId}");

<<<<<<< HEAD
            // ✅ SAUVEGARDER LA NOTIFICATION EN BASE DE DONNÉES (pour persistance)
            // IMPORTANT: Use DriverId as UserId so driver can retrieve notification when reconnecting
            var notificationEntity = new Notification
            {
                Type = "NEW_TRIP_ASSIGNMENT",
                Title = "Nouvelle Mission",
                Message = $"Vous avez été assigné au trip {trip.TripReference}",
                Timestamp = DateTime.UtcNow,
                TripId = trip.Id,
                TripReference = trip.TripReference,
                DriverName = driver.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                AdditionalData = System.Text.Json.JsonSerializer.Serialize(new
                {
                    assignmentId = assignment.Id,
                    destination = destination,
                    estimatedDistance = trip.EstimatedDistance,
                    estimatedDuration = trip.EstimatedDuration,
                    expiresAt = assignment.ExpiresAt,
                    deliveriesCount = trip.Deliveries.Count,
                    customerName = trip.Deliveries.FirstOrDefault()?.Customer?.Name
                }),
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notificationEntity);
            await _context.SaveChangesAsync();

            // ✅ FIX PERMANENT: Use the actual User ID linked to the driver
            // Now that we have driver.user_id properly set, use it for notifications
            int actualUserId = driver.user_id ?? request.DriverId; // Fallback to DriverId if user_id not set
            
            // Créer la notification utilisateur liée
            var userNotification = new UserNotification
            {
                NotificationId = notificationEntity.Id,
                UserId = actualUserId, // Use the linked User ID
                IsRead = false,
                ReadAt = null
            };

            _context.UserNotifications.Add(userNotification);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"✅ UserNotification created - UserId: {actualUserId}, DriverId: {request.DriverId}, NotificationId: {notificationEntity.Id}");
            _logger.LogInformation($"✅ Notification SAVED to database - ID: {notificationEntity.Id}");

            // ✅ Send notification ONLY to the specific assigned driver (NOT to all drivers in group)
            // Method 1: Send to User ID (SignalR uses JWT User ID from token)
            await _gpsHub.Clients.User(actualUserId.ToString()).SendAsync("NewTripAssigned", notification);
            _logger.LogInformation($"✅ Sent to User {actualUserId} (SPECIFIC DRIVER ONLY)");

            // ❌ DO NOT send to driver group (would send to ALL drivers)
            // await _gpsHub.Clients.Group($"driver-{request.DriverId}").SendAsync("NewTripAssigned", notification);

            // Broadcast to admins only (they need to know)
=======
            // Method 1: Send to User ID (SignalR uses JWT User ID)
            await _gpsHub.Clients.User(userIdForNotification.ToString()).SendAsync("NewTripAssigned", notification);
            _logger.LogInformation($"✅ Sent to User {userIdForNotification}");

            // Method 2: Send to driver group
            await _gpsHub.Clients.Group($"driver-{request.DriverId}").SendAsync("NewTripAssigned", notification);
            _logger.LogInformation($"✅ Sent to group driver-{request.DriverId}");

            // Broadcast à tous les admins
>>>>>>> dev
            await _gpsHub.Clients.Group("Admins").SendAsync("TripAssigned", new
            {
                tripId = trip.Id,
                tripReference = trip.TripReference,
                driverId = driver.Id,
                driverName = driver.Name,
                assignedAt = DateTime.UtcNow
            });

            _logger.LogInformation($"✅ NOTIFICATION ENVOYÉE - Trip {trip.TripReference} assigned to driver {driver.Name} (User ID: {userIdForNotification})");

            return Ok(new
            {
                success = true,
                message = "Trip assigné avec succès",
                assignmentId = assignment.Id,
                tripReference = trip.TripReference
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error assigning trip");
            return StatusCode(500, new { message = "Erreur lors de l'assignment", error = ex.Message });
        }
    }

    /// <summary>
    /// Géocoder une adresse avec Nominatim
    /// </summary>
    private async Task<(double lat, double lng)?> GeocodeAddress(string address)
    {
        try
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "TMS-App/1.0");
            
            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(address)}&format=json&limit=1";
            var response = await httpClient.GetAsync(url);
            
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var results = System.Text.Json.JsonSerializer.Deserialize<List<JsonElement>>(json);
                
                if (results != null && results.Count > 0)
                {
                    var lat = results[0].GetProperty("lat").GetString();
                    var lon = results[0].GetProperty("lon").GetString();
                    
                    if (double.TryParse(lat, out double latitude) && 
                        double.TryParse(lon, out double longitude))
                    {
                        return (latitude, longitude);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error geocoding address");
        }
        
        return null;
    }

    /// <summary>
    /// Obtenir les assignments d'un chauffeur
    /// </summary>
    [HttpGet("driver/{driverId}")]
    public async Task<IActionResult> GetDriverAssignments(int driverId, [FromQuery] string? status = null)
    {
        var query = _context.TripAssignments
            .Include(a => a.Trip)
                .ThenInclude(t => t.Truck)
            .Include(a => a.Trip)
                .ThenInclude(t => t.Deliveries)
            .Where(a => a.DriverId == driverId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<AssignmentStatus>(status, out var parsedStatus))
        {
            query = query.Where(a => a.Status == parsedStatus);
        }

        var assignments = await query
            .OrderByDescending(a => a.AssignedAt)
            .Select(a => new
            {
                a.Id,
                a.TripId,
<<<<<<< HEAD
                TripReference = a.Trip.TripReference,
=======
                TripReference = a.Trip != null ? a.Trip.TripReference : null,
>>>>>>> dev
                Status = a.Status.ToString(),
                a.AssignedAt,
                a.RespondedAt,
                a.ExpiresAt,
                RejectionReason = a.RejectionReason,
<<<<<<< HEAD
                TripStatus = a.Trip.TripStatus.ToString(),
                TruckImmatriculation = a.Trip.Truck.Immatriculation,
                DeliveriesCount = a.Trip.Deliveries.Count
=======
                TripStatus = a.Trip != null ? a.Trip.TripStatus.ToString() : null,
                TruckImmatriculation = a.Trip != null && a.Trip.Truck != null ? a.Trip.Truck.Immatriculation : null,
                DeliveriesCount = a.Trip != null ? a.Trip.Deliveries.Count : 0
>>>>>>> dev
            })
            .ToListAsync();

        return Ok(new { assignments });
    }

    /// <summary>
    /// Obtenir toutes les assignments en attente
    /// </summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingAssignments()
    {
        var assignments = await _context.TripAssignments
            .Include(a => a.Trip)
            .Include(a => a.Driver)
            .Where(a => a.Status == AssignmentStatus.Pending)
            .OrderBy(a => a.AssignedAt)
            .Select(a => new
            {
                a.Id,
                a.TripId,
                TripReference = a.Trip != null ? a.Trip.TripReference : null,
                DriverId = a.DriverId,
                DriverName = a.Driver != null ? a.Driver.Name : null,
<<<<<<< HEAD
                DriverPhone = a.Driver != null ? a.Driver.Phone : null,
=======
                DriverPhone = a.Driver != null ? a.Driver.PhoneNumber : null,
>>>>>>> dev
                a.AssignedAt,
                a.ExpiresAt,
                IsExpired = a.ExpiresAt < DateTime.UtcNow
            })
            .ToListAsync();

        return Ok(new { assignments });
    }
}

public class AssignTripRequest
{
    public int TripId { get; set; }
    public int DriverId { get; set; }
}
