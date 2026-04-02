using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Hubs;
using TransportManagementSystem.Models;
using TransportManagementSystem.Services;
using static TransportManagementSystem.Entity.Delivery;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripsController : ControllerBase
{
    private readonly IRepository<Trip> tripRepository;
    private readonly IRepository<Delivery> deliveryRepository;
    private readonly ApplicationDbContext context;
    private readonly INotificationService _notificationService;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    private readonly NotificationHubService _notificationHubService;
    private readonly IHubContext<GPSHub> _gpsHub;
    private readonly ILogger<TripsController> _logger;

<<<<<<< HEAD
=======
    private readonly IHubContext<GPSHub> _gpsHub;
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    public TripsController(
        IRepository<Trip> tripRepository,
        IRepository<Delivery> deliveryRepository,
        ApplicationDbContext context,
        INotificationService notificationService,
<<<<<<< HEAD
<<<<<<< HEAD
        NotificationHubService notificationHubService,
        IHubContext<GPSHub> gpsHub,
        ILogger<TripsController> logger)
=======
        IHubContext<GPSHub> gpsHub)
>>>>>>> dev
=======
        NotificationHubService notificationHubService,
        IHubContext<GPSHub> gpsHub,
        ILogger<TripsController> logger)
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    {
        this.tripRepository = tripRepository;
        this.deliveryRepository = deliveryRepository;
        this.context = context; 
        this._gpsHub = gpsHub;
        this._notificationService = notificationService;
        this._notificationHubService = notificationHubService;
        this._gpsHub = gpsHub;
        this._logger = logger;
    }

    /// <summary>
    /// Get all trips (simplified endpoint for mobile)
    /// </summary>
    [HttpGet("list")]
    public async Task<IActionResult> GetTripsList([FromQuery] string? status = null)
    {
        try
        {
            var query = context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<TripStatus>(status, out var parsedStatus))
                {
                    query = query.Where(t => t.TripStatus == parsedStatus);
                }
            }

            var trips = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.TripReference,
                    t.BookingId,
                    Status = t.TripStatus.ToString(),
                    DriverName = t.Driver != null ? t.Driver.Name : null,
                    TruckImmatriculation = t.Truck != null ? t.Truck.Immatriculation : null,
                    t.EstimatedDistance,
                    t.EstimatedDuration,
                    t.CreatedAt,
                    DeliveriesCount = t.Deliveries.Count
                })
                .ToListAsync();

            // Return array directly for compatibility
            return Ok(trips);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error loading trips", error = ex.Message });
        }
    }

    /// <summary>
    /// Get trips with pagination and filters
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetTrips(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        try
        {
            var query = context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<TripStatus>(status, out var parsedStatus))
                {
                    query = query.Where(t => t.TripStatus == parsedStatus);
                }
            }

            var totalItems = await query.CountAsync();
            var trips = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    t.TripReference,
                    t.BookingId,
                    Status = t.TripStatus.ToString(),
                    DriverName = t.Driver != null ? t.Driver.Name : null,
                    TruckImmatriculation = t.Truck != null ? t.Truck.Immatriculation : null,
                    t.EstimatedDistance,
                    t.EstimatedDuration,
                    t.CreatedAt,
                    DeliveriesCount = t.Deliveries.Count
                })
                .ToListAsync();

            return Ok(new
            {
                data = trips,
                total = totalItems,
                page = page,
                pageSize = pageSize,
                totalPages = Math.Ceiling(totalItems / (double)pageSize)
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error loading trips", error = ex.Message });
        }
    }

    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetTrips([FromQuery] SearchOptions searchOptions)
    {
        var query = context.Trips
            .AsNoTracking()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchOptions.Search))
        {
            var search = searchOptions.Search;

            query = query.Where(t =>
                t.BookingId.Contains(search) ||
                (t.TripReference != null && t.TripReference.Contains(search)) ||
                t.TripStatus.ToString().Contains(search) ||
<<<<<<< HEAD
<<<<<<< HEAD
                (t.Truck != null && t.Truck.Immatriculation != null ? t.Truck.Immatriculation.Contains(search) : false) ||
                (t.Driver != null && t.Driver.Name != null ? t.Driver.Name.Contains(search) : false) ||
=======
                (t.Truck != null && t.Truck.Immatriculation.Contains(search)) ||
                (t.Driver != null && t.Driver.Name.Contains(search)) ||
                (t.Convoyeur != null && t.Convoyeur.Name.Contains(search)) ||
>>>>>>> dev
=======
                (t.Truck != null && t.Truck.Immatriculation != null ? t.Truck.Immatriculation.Contains(search) : false) ||
                (t.Driver != null && t.Driver.Name != null ? t.Driver.Name.Contains(search) : false) ||
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                t.Deliveries.Any(d =>
                    d.Customer != null &&
                    d.Customer.Name != null ? d.Customer.Name.Contains(search) : false
                )
            );
        }

        if (!string.IsNullOrWhiteSpace(searchOptions.Reference))
        {
            var reference = searchOptions.Reference;

            query = query.Where(t =>
                t.BookingId.Contains(reference) ||
                (t.TripReference != null && t.TripReference.Contains(reference))
            );
        }

        if (!string.IsNullOrWhiteSpace(searchOptions.CustomerName))
        {
            var customerName = searchOptions.CustomerName;

            query = query.Where(t =>
                t.Deliveries.Any(d =>
                    d.Customer != null &&
                    d.Customer.Name != null ? d.Customer.Name.Contains(customerName) : false
                )
            );
        }

        if (searchOptions.TripStatus.HasValue)
            query = query.Where(t => t.TripStatus == searchOptions.TripStatus.Value);

        if (searchOptions.TruckId.HasValue)
            query = query.Where(t => t.TruckId == searchOptions.TruckId.Value);

        if (searchOptions.DriverId.HasValue)
            query = query.Where(t => t.DriverId == searchOptions.DriverId.Value);

        if (searchOptions.ConvoyeurId.HasValue)
            query = query.Where(t => t.ConvoyeurId == searchOptions.ConvoyeurId.Value);

        if (searchOptions.StartDate.HasValue)
        {
            query = query.Where(t =>
                t.EstimatedStartDate.HasValue &&
                t.EstimatedStartDate.Value >= searchOptions.StartDate.Value);
        }

        if (searchOptions.EndDate.HasValue)
        {
            query = query.Where(t =>
                t.EstimatedStartDate.HasValue &&
                t.EstimatedStartDate.Value <= searchOptions.EndDate.Value);
        }


        bool ascending = string.Equals(
            searchOptions.SortDirection,
            "asc",
            StringComparison.OrdinalIgnoreCase);

        query = searchOptions.SortField?.ToLower() switch
        {
            "bookingid" => ascending
                ? query.OrderBy(t => t.BookingId)
                : query.OrderByDescending(t => t.BookingId),

            "tripstatus" => ascending
                ? query.OrderBy(t => t.TripStatus)
                : query.OrderByDescending(t => t.TripStatus),

            "estimatedstartdate" => ascending
                ? query.OrderBy(t => t.EstimatedStartDate)
                : query.OrderByDescending(t => t.EstimatedStartDate),

            "estimatedenddate" => ascending
                ? query.OrderBy(t => t.EstimatedEndDate)
                : query.OrderByDescending(t => t.EstimatedEndDate),

            "truck" => ascending
                ? query.OrderBy(t => t.Truck != null ? t.Truck.Immatriculation : string.Empty)
                : query.OrderByDescending(t => t.Truck != null ? t.Truck.Immatriculation : string.Empty),

            "driver" => ascending
                ? query.OrderBy(t => t.Driver != null ? t.Driver.Name : string.Empty)
                : query.OrderByDescending(t => t.Driver != null ? t.Driver.Name : string.Empty),

            "convoyeur" => ascending
                ? query.OrderBy(t => t.Convoyeur != null ? t.Convoyeur.Name : string.Empty)
                : query.OrderByDescending(t => t.Convoyeur != null ? t.Convoyeur.Name : string.Empty),

            "deliverycount" => ascending
                ? query.OrderBy(t => t.Deliveries.Count())
                : query.OrderByDescending(t => t.Deliveries.Count()),

            _ => query.OrderByDescending(t => t.CreatedAt)
        };


        var totalCount = await query.CountAsync();


        if (searchOptions.PageIndex.HasValue && searchOptions.PageSize.HasValue)
        {
            query = query
                .Skip(searchOptions.PageIndex.Value * searchOptions.PageSize.Value)
                .Take(searchOptions.PageSize.Value);
        }


        var tripDtos = await query
            .Select(t => new TripListDto
            {
                Id = t.Id,
                BookingId = t.BookingId,
                TripReference = t.TripReference,
                TripStatus = t.TripStatus,
                EstimatedStartDate = t.EstimatedStartDate ?? DateTime.MinValue,
                EstimatedEndDate = t.EstimatedEndDate ?? DateTime.MinValue,
                ActualStartDate = t.ActualStartDate,
                ActualEndDate = t.ActualEndDate,
                EstimatedDistance = t.EstimatedDistance,
                EstimatedDuration = t.EstimatedDuration,
                TrajectId = t.TrajectId,
                ConvoyeurId = t.ConvoyeurId,
                Message = t.Message,
                CreatedBy = t.CreatedById,
                CreatedAt = t.CreatedAt,
                UpdatedBy = t.UpdatedById,
                UpdatedAt = t.UpdatedAt,

<<<<<<< HEAD
<<<<<<< HEAD
                Truck = t.Truck != null ? t.Truck.Immatriculation : string.Empty,
                Driver = t.Driver != null ? t.Driver.Name : string.Empty,
=======
                Truck = t.Truck != null ? t.Truck.Immatriculation : null,
                Driver = t.Driver != null ? t.Driver.Name : null,
                Convoyeur = t.Convoyeur != null ? t.Convoyeur.Name : null,
>>>>>>> dev
=======
                Truck = t.Truck != null ? t.Truck.Immatriculation : string.Empty,
                Driver = t.Driver != null ? t.Driver.Name : string.Empty,
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

                DeliveryCount = t.Deliveries.Count(),
                CompletedDeliveries = t.Deliveries
                    .Count(d => d.Status == DeliveryStatus.Delivered),

                CreatedByName = context.Users
                    .Where(u => u.Id == t.CreatedById)
                    .Select(u => u.Name)
                    .FirstOrDefault(),

                UpdatedByName = t.UpdatedById.HasValue
                    ? context.Users
                        .Where(u => u.Id == t.UpdatedById.Value)
                        .Select(u => u.Name)
                        .FirstOrDefault()
                    : string.Empty
            })
            .ToListAsync();

        var result = new PagedData<TripListDto>
        {
            TotalData = totalCount,
            Data = tripDtos
        };

        return Ok(new ApiResponse(true, "Voyages récupérés avec succès", result));
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> GetTripById(int id)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
                .ThenInclude(t => t.TypeTruck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Customer)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));


        var tripDetails = new TripDetailsDto
        {
            Id = trip.Id,
            TruckId = trip.TruckId,
            DriverId = trip.DriverId,
            ConvoyeurId = trip.ConvoyeurId,
            BookingId = trip.BookingId,
            TripReference = trip.TripReference,
            TripStatus = trip.TripStatus,
            EstimatedDistance = trip.EstimatedDistance,
            EstimatedDuration = trip.EstimatedDuration,
            EstimatedStartDate = trip.EstimatedStartDate ?? DateTime.MinValue,
            EstimatedEndDate = trip.EstimatedEndDate ?? DateTime.MinValue,
            ActualStartDate = trip.ActualStartDate,
            ActualEndDate = trip.ActualEndDate,
            TrajectId = trip.TrajectId,

            Truck = trip.Truck != null ? new TruckDto
            {
                Id = trip.Truck.Id,
                Immatriculation = trip.Truck.Immatriculation ?? string.Empty,
                MarqueTruckId = trip.Truck.MarqueTruckId,
                Color = trip.Truck.Color,
                Status = trip.Truck.Status,
                TechnicalVisitDate = trip.Truck.TechnicalVisitDate,
                DateOfFirstRegistration = trip.Truck.DateOfFirstRegistration,
                EmptyWeight = trip.Truck.EmptyWeight,
                TypeTruckId = trip.Truck.TypeTruckId,
                TypeTruck = trip.Truck.TypeTruck != null ? new TypeTruckDto
                {
                    Id = trip.Truck.TypeTruck.Id,
                    Type = trip.Truck.TypeTruck.Type ?? string.Empty,
<<<<<<< HEAD
                    Capacity = trip.Truck.TypeTruck.Capacity,
<<<<<<< HEAD
                    Unit = trip.Truck.TypeTruck.Unit ?? string.Empty
=======

>>>>>>> dev
=======
                    Capacity = trip.Truck.TypeTruck.Capacity
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                } : null,
            } : null,

            Driver = trip.Driver != null ? new DriverDto
            {
                Id = trip.Driver.Id,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                Name = trip.Driver.Name ?? string.Empty,
                DrivingLicense = trip.Driver.PermisNumber ?? string.Empty,
                PhoneNumber = trip.Driver.Phone ?? string.Empty,
                Status = trip.Driver.Status ?? string.Empty,
<<<<<<< HEAD
                PhoneCountry = trip.Driver.phoneCountry ?? string.Empty
=======
                Name = trip.Driver.Name,
                DrivingLicense = trip.Driver.DrivingLicense,
                PhoneNumber = trip.Driver.PhoneNumber,
                Status = trip.Driver.Status,
                PhoneCountry = trip.Driver.PhoneCountry
>>>>>>> dev
            } : null,

            Convoyeur = trip.Convoyeur != null ? new ConvoyeurDto
            {
                Id = trip.Convoyeur.Id,
                Name = trip.Convoyeur.Name,
                Matricule = trip.Convoyeur.Matricule,
                Phone = trip.Convoyeur.PhoneNumber,
                Status = trip.Convoyeur.Status,
                PhoneCountry = trip.Convoyeur.PhoneCountry
=======
                PhoneCountry = trip.Driver.PhoneCountry ?? string.Empty
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            } : null,

            Deliveries = trip.Deliveries
                .OrderBy(d => d.Sequence)
                .Select(d => new DeliveryDetailsDto
                {
                    Id = d.Id,
                    Sequence = d.Sequence,
                    CustomerId = d.CustomerId,
                    CustomerName = d.Customer?.Name ?? string.Empty,
                    CustomerMatricule = d.Customer?.Matricule ?? string.Empty,
                    OrderId = d.OrderId,
                    OrderReference = d.Order?.Reference ?? string.Empty,
                    OrderWeight = d.Order?.Weight ?? 0,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                    DeliveryAddress = d.DeliveryAddress ?? string.Empty,
                    Geolocation = d.Geolocation, // Coordonnées GPS
                    Latitude = d.Location != null ? d.Location.Latitude : (double?)null,
                    Longitude = d.Location != null ? d.Location.Longitude : (double?)null,
<<<<<<< HEAD
=======
                    DeliveryAddress = d.DeliveryAddress,
                    Geolocation = d.Geolocation,
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                    PlannedTime = d.PlannedTime,
                    ActualArrivalTime = d.ActualArrivalTime,
                    ActualDepartureTime = d.ActualDepartureTime,
                    Status = d.Status,
                    Notes = d.Notes ?? string.Empty
                }).ToList()
        };

        return Ok(new ApiResponse(true, "Trajet récupéré avec succès", tripDetails));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTrip([FromBody] CreateTripDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));


        if (model.EstimatedEndDate <= model.EstimatedStartDate)
        {
            return BadRequest(new ApiResponse(false,
                "La date de fin estimée doit être après la date de début"));
        }


        var truck = await context.Trucks.FindAsync(model.TruckId);
        if (truck == null)
            return BadRequest(new ApiResponse(false, "Camion non trouvé"));

        // DriverId from frontend is now User.Id (since we use Users table for drivers)
        // Find the Driver record that has user_id = model.DriverId
        var driver = await context.Set<Driver>().FirstOrDefaultAsync(d => d.user_id == model.DriverId);
        
        // If no Driver record exists for this User, create one automatically
        if (driver == null)
        {
            var user = await context.Users.FindAsync(model.DriverId);
            if (user != null)
            {
                driver = new Driver
                {
                    Email = user.Email,
                    Name = user.Name,
                    PhoneNumber = user.Phone,
                    EmployeeCategory = "DRIVER",
                    IsEnable = true,
                    IsInternal = true,
                    Status = "Disponible",
                    user_id = user.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                context.Set<Driver>().Add(driver);
                await context.SaveChangesAsync();
            }
        }
        
        if (driver == null)
            return BadRequest(new ApiResponse(false, $"Chauffeur non trouvé (UserId: {model.DriverId})"));

        // Check convoyeur if provided
        if (model.ConvoyeurId.HasValue)
        {
            var convoyeur = await context.Set<Convoyeur>().FindAsync(model.ConvoyeurId.Value);
            if (convoyeur == null)
                return BadRequest(new ApiResponse(false, "Convoyeur non trouvé"));
        }


        var lastBookingId = await tripRepository.Query()
            .OrderByDescending(t => t.Id)
            .Select(t => t.BookingId)
            .FirstOrDefaultAsync();

        int nextNumber = 1;
        if (!string.IsNullOrEmpty(lastBookingId) && lastBookingId.StartsWith("TMS"))
        {
            if (int.TryParse(lastBookingId[3..], out var lastNumber))
                nextNumber = lastNumber + 1;
        }
        var year = model.EstimatedStartDate.Year;

var lastTripReference = await tripRepository.Query()
            .Where(t => t.TripReference.StartsWith($"LIV-{year}-"))
            .OrderByDescending(t => t.TripReference)
            .Select(t => t.TripReference)
            .FirstOrDefaultAsync();

        int nextSequence = 1;

        if (!string.IsNullOrEmpty(lastTripReference))
        {

            var parts = lastTripReference.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var lastNumber))
            {
                nextSequence = lastNumber + 1;
            }
        }

        var tripReference = $"LIV-{year}-{nextSequence:D3}";
var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var trip = new Trip
        {
            BookingId = $"TMS{nextNumber:D5}",
            TripReference = tripReference,
            EstimatedDistance = model.EstimatedDistance,
            EstimatedDuration = model.EstimatedDuration,
            CreatedById = userId,
            CreatedAt = DateTime.UtcNow,
            TruckId = model.TruckId,
            DriverId = model.DriverId,
            ConvoyeurId = model.ConvoyeurId,
            TripStatus = TripStatus.Planned,
            EstimatedStartDate = model.EstimatedStartDate,
            EstimatedEndDate = model.EstimatedEndDate,
            TrajectId = model.TrajectId,
        };

        await tripRepository.AddAsync(trip);
        await tripRepository.SaveChangesAsync();

        _logger.LogInformation($"✅ Trip created successfully - ID: {trip.Id}, Reference: {trip.TripReference}");

        truck.Status = "En mission";
        driver.Status = "En mission";
        context.Trucks.Update(truck);
        context.Set<Driver>().Update(driver);

        // ✅ SAUVEGARDER LE VOYAGE D'ABORD
        if (model.Deliveries?.Any() == true)
        {
            var deliveries = model.Deliveries.Select(d => new Delivery
            {
                TripId = trip.Id,
                CustomerId = d.CustomerId,
                OrderId = d.OrderId,
                DeliveryAddress = d.DeliveryAddress,
<<<<<<< HEAD
<<<<<<< HEAD
                Geolocation = d.Geolocation, // Stocker les coordonnées GPS
=======
                Geolocation = d.Geolocation,
>>>>>>> dev
=======
                Geolocation = d.Geolocation, // Stocker les coordonnées GPS
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                Sequence = d.Sequence,
                PlannedTime = d.PlannedTime,
                Status = DeliveryStatus.Pending,
                Notes = d.Notes
            });

            await deliveryRepository.AddRangeAsync(deliveries);
            _logger.LogInformation($"✅ Deliveries added - Count: {deliveries.Count()}");
        }

        await context.SaveChangesAsync();
        _logger.LogInformation($"✅ Trip and deliveries saved to database");
        
        // ✅ CRÉER LA NOTIFICATION MAINTENANT (AVANT UpdateDriverAvailabilityForTrip qui peut échouer)
        _logger.LogInformation($"📢 START creating notification for trip {trip.TripReference} to driver {model.DriverId}");
        
        try
        {
            // Get delivery details for notification
            var tripWithDeliveries = await context.Trips
                .Include(t => t.Deliveries)
                    .ThenInclude(d => d.Order)
                .FirstOrDefaultAsync(t => t.Id == trip.Id);

            var firstDelivery = tripWithDeliveries?.Deliveries.FirstOrDefault();
            var lastDelivery = tripWithDeliveries?.Deliveries.LastOrDefault();
            var destination = lastDelivery?.DeliveryAddress ?? "Non définie";
            var customerName = firstDelivery?.Customer?.Name ?? "Inconnu";

            // ✅ FIX PERMANENT: Use the user_id linked to the driver
            // Now that we have driver.user_id properly set, use it for notifications
            int userIdForNotification = driver.user_id ?? model.DriverId; // Fallback to DriverId if user_id not set
            _logger.LogInformation($"🔍 Driver {model.DriverId} ({driver.Email}) -> User ID: {userIdForNotification} (from driver.user_id)");

            // ✅ SAUVEGARDER LA NOTIFICATION EN BASE DE DONNÉES (pour persistance)
            var notificationEntity = new Notification
            {
                Type = "NEW_TRIP_ASSIGNMENT",
                Title = "Nouvelle Mission",
                Message = $"Trip {trip.TripReference} assigné - Destination: {destination}",
                Timestamp = DateTime.UtcNow,
                TripId = trip.Id,
                TripReference = trip.TripReference,
                DriverName = driver.Name,
                TruckImmatriculation = truck.Immatriculation,
                AdditionalData = System.Text.Json.JsonSerializer.Serialize(new
                {
                    destination = destination,
                    estimatedDistance = trip.EstimatedDistance,
                    estimatedDuration = trip.EstimatedDuration,
                    deliveriesCount = tripWithDeliveries?.Deliveries.Count ?? 0,
                    customerName = customerName
                }),
                CreatedAt = DateTime.UtcNow
            };

            context.Notifications.Add(notificationEntity);
            _logger.LogInformation($"✅ Notification entity added to context");

            // Créer la notification utilisateur liée
            // CRITICAL: Use userIdForNotification (from User table), NOT model.DriverId!
            // This MUST match the UserId in the JWT token
            var userNotification = new UserNotification
            {
                NotificationId = notificationEntity.Id,
                UserId = userIdForNotification, // MUST match JWT token UserId
                IsRead = false,
                ReadAt = null
            };

            context.UserNotifications.Add(userNotification);
            await context.SaveChangesAsync();

            _logger.LogInformation($"✅ UserNotification created - UserId: {userIdForNotification}, NotificationId: {notificationEntity.Id}");
            _logger.LogInformation($"✅ Notification SAVED to database - ID: {notificationEntity.Id}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Error creating notification for trip {trip.TripReference}");
            // Continue even if notification fails - don't block trip creation
        }

        // ✅ MAINTENANT mettre à jour les disponibilités (peut échouer mais notification est déjà sauvegardée)
        try
        {
            await UpdateDriverAvailabilityForTrip(model.DriverId, model.EstimatedStartDate, model.EstimatedEndDate, trip.Id, tripReference);
            await UpdateTruckAvailabilityForTrip(model.TruckId, model.EstimatedStartDate, model.EstimatedEndDate, tripReference);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, $"⚠️ Driver/Truck availability update failed, but trip created successfully");
            // Continue - trip was created successfully
        }

        // Send real-time notification via SignalR
        try
        {
            var tripWithDeliveries = await context.Trips
                .Include(t => t.Deliveries)
                    .ThenInclude(d => d.Order)
                .FirstOrDefaultAsync(t => t.Id == trip.Id);

            var firstDelivery = tripWithDeliveries?.Deliveries.FirstOrDefault();
            var lastDelivery = tripWithDeliveries?.Deliveries.LastOrDefault();
            var destination = lastDelivery?.DeliveryAddress ?? "Non définie";
            var customerName = firstDelivery?.Customer?.Name ?? "Inconnu";

            // ✅ Driver.Id IS the User.Id now (since we use Users table directly)
            // This matches the UserId in the JWT token for SignalR notifications
            int userIdForNotification = model.DriverId;
            _logger.LogInformation($"🔍 Driver {model.DriverId} ({driver.Name}) -> User ID for SignalR: {userIdForNotification}");

            var notification = new
            {
                type = "NEW_TRIP_ASSIGNMENT",
                title = "🚛 Nouvelle Mission Assignée",
                message = $"Trip {trip.TripReference} assigné - Destination: {destination}",
                tripId = trip.Id,
                tripReference = trip.TripReference,
                assignmentId = (int?)null,
                driverId = model.DriverId,
                driverName = driver.Name,
                truckImmatriculation = truck.Immatriculation,
                destination = destination,
                customerName = customerName,
                deliveriesCount = tripWithDeliveries?.Deliveries.Count ?? 0,
                estimatedDistance = trip.EstimatedDistance,
                estimatedDuration = trip.EstimatedDuration,
                estimatedStartDate = trip.EstimatedStartDate,
                estimatedEndDate = trip.EstimatedEndDate,
                timestamp = DateTime.UtcNow
            };

            _logger.LogInformation($"📨 Sending notification via NotificationHubService...");

            // Send via NotificationHubService - MULTIPLE CHANNELS for reliability
            await _notificationHubService.SendTripAssignment(userIdForNotification, notification, model.DriverId);

            _logger.LogInformation($"✅ NOTIFICATION SENT to User ID {userIdForNotification} and driver-{model.DriverId} group");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ ERREUR NOTIFICATION: {ex.Message}");
        }

        var createdTrip = await GetTripById(trip.Id);

        return CreatedAtAction(nameof(GetTripById),
            new { id = trip.Id },
            new ApiResponse(true, "Trajet créé avec succès", createdTrip));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTrip(int id, [FromBody] UpdateTripDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var trip = await context.Trips
            .Include(t => t.Truck)
                .ThenInclude(t => t.TypeTruck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Deliveries)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
var nonEditableStatuses = new[]
    {
        TripStatus.Accepted,
        TripStatus.LoadingInProgress,
        TripStatus.DeliveryInProgress,
        TripStatus.Receipt,
        TripStatus.Cancelled
    };
<<<<<<< HEAD
=======
        var nonEditableStatuses = new[]
        {
            TripStatus.Accepted,
            TripStatus.LoadingInProgress,
            TripStatus.DeliveryInProgress,
            TripStatus.Receipt,
            TripStatus.Cancelled
        };
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

    if (nonEditableStatuses.Contains(trip.TripStatus))
return BadRequest(new ApiResponse(false,
                $"Impossible de modifier un trajet avec le statut: {TripStatusTransitions.GetStatusLabel(trip.TripStatus)}. " +
                "Seuls les trajets 'Planifié' peuvent être modifiés."));

        var oldDriverId = trip.DriverId;
        var oldConvoyeurId = trip.ConvoyeurId;
        var oldTruckId = trip.TruckId;
        var oldStartDate = trip.EstimatedStartDate;
        var oldEndDate = trip.EstimatedEndDate;

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userId = !string.IsNullOrEmpty(userIdClaim) ? int.Parse(userIdClaim) : 0;

        trip.EstimatedDistance = model.EstimatedDistance;
        trip.EstimatedDuration = model.EstimatedDuration;
        trip.EstimatedStartDate = model.EstimatedStartDate;
        trip.EstimatedEndDate = model.EstimatedEndDate;
        trip.TruckId = model.TruckId;
        trip.DriverId = model.DriverId;
        trip.ConvoyeurId = model.ConvoyeurId;
        trip.TripStatus = model.TripStatus;
        trip.TrajectId = model.TrajectId;
        trip.UpdatedById = userId;
        trip.UpdatedAt = DateTime.UtcNow;

        // Handle driver changes
        if (oldDriverId != model.DriverId)
        {
            if (oldDriverId != 0 && oldStartDate.HasValue && oldEndDate.HasValue)
            {
                await RestoreDriverAvailabilityForTrip(oldDriverId, oldStartDate.Value, oldEndDate.Value, trip.TripReference);

                var oldDriver = await context.Set<Driver>().FirstOrDefaultAsync(d => d.user_id == oldDriverId);
                if (oldDriver != null)
                {
                    oldDriver.Status = "Disponible";
                    context.Set<Driver>().Update(oldDriver);
                }
            }

            var newDriver = await context.Set<Driver>().FirstOrDefaultAsync(d => d.user_id == model.DriverId);
            if (newDriver != null)
            {
                newDriver.Status = "En mission";
                context.Set<Driver>().Update(newDriver);
            }

            if (model.DriverId != 0)
            {
                await UpdateDriverAvailabilityForTrip(model.DriverId, model.EstimatedStartDate, model.EstimatedEndDate, trip.Id, trip.TripReference);
            }
        }
        else if (oldDriverId == model.DriverId && oldDriverId != 0)
        {
            if (oldStartDate != model.EstimatedStartDate || oldEndDate != model.EstimatedEndDate)
            {
                var oldStart = oldStartDate ?? DateTime.MinValue;
                var oldEnd = oldEndDate ?? DateTime.MaxValue;
                await RestoreDriverAvailabilityForTrip(model.DriverId, oldStart, oldEnd, trip.TripReference);
                await UpdateDriverAvailabilityForTrip(model.DriverId, model.EstimatedStartDate, model.EstimatedEndDate, trip.Id, trip.TripReference);
            }
        }

        // Handle convoyeur changes
        if (oldConvoyeurId != model.ConvoyeurId)
        {
            if (oldConvoyeurId.HasValue && oldStartDate.HasValue && oldEndDate.HasValue)
            {
                // Restore convoyeur availability if needed
                // You might want to implement a separate availability system for convoyeurs
            }
        }

        // Handle truck changes
        if (oldTruckId != model.TruckId)
        {
            if (oldTruckId != 0 && oldStartDate.HasValue && oldEndDate.HasValue)
            {
                await RestoreTruckAvailabilityForTrip(oldTruckId, oldStartDate.Value, oldEndDate.Value, trip.TripReference);

                var oldTruck = await context.Trucks.FindAsync(oldTruckId);
                if (oldTruck != null)
                {
                    oldTruck.Status = "Disponible";
                    context.Trucks.Update(oldTruck);
                }
            }

            var newTruck = await context.Trucks.FindAsync(model.TruckId);
            if (newTruck != null)
            {
                newTruck.Status = "En mission";
                context.Trucks.Update(newTruck);
            }

            if (model.TruckId != 0)
            {
                await UpdateTruckAvailabilityForTrip(model.TruckId, model.EstimatedStartDate, model.EstimatedEndDate, trip.TripReference);
            }
        }
        else if (oldTruckId == model.TruckId && oldTruckId != 0)
        {
            if (oldStartDate != model.EstimatedStartDate || oldEndDate != model.EstimatedEndDate)
            {
                var oldStart = oldStartDate ?? DateTime.MinValue;
                var oldEnd = oldEndDate ?? DateTime.MaxValue;
                await RestoreTruckAvailabilityForTrip(model.TruckId, oldStart, oldEnd, trip.TripReference);
                await UpdateTruckAvailabilityForTrip(model.TruckId, model.EstimatedStartDate, model.EstimatedEndDate, trip.TripReference);
            }
        }

        if (model.Deliveries != null)
        {
            if (trip.Deliveries.Any())
                context.Deliveries.RemoveRange(trip.Deliveries);

            var newDeliveries = model.Deliveries.Select(d => new Delivery
            {
                TripId = trip.Id,
                CustomerId = d.CustomerId,
                OrderId = d.OrderId,
                DeliveryAddress = d.DeliveryAddress,
<<<<<<< HEAD
<<<<<<< HEAD
                Geolocation = d.Geolocation, // Stocker les coordonnées GPS
=======
                Geolocation = d.Geolocation,
>>>>>>> dev
=======
                Geolocation = d.Geolocation, // Stocker les coordonnées GPS
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                Sequence = d.Sequence,
                PlannedTime = d.PlannedTime,
                Status = DeliveryStatus.Pending,
                Notes = d.Notes
            }).ToList();

            await context.Deliveries.AddRangeAsync(newDeliveries);
        }

        context.Trips.Update(trip);
        await context.SaveChangesAsync();

        var updatedTrip = await context.Trips
            .Include(t => t.Truck)
                .ThenInclude(t => t.TypeTruck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Deliveries)
            .FirstOrDefaultAsync(t => t.Id == trip.Id);

        return Ok(new ApiResponse(true, $"Trajet {id} mis à jour avec succès", updatedTrip ?? new object()));
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateTripStatus(int id, [FromBody] UpdateTripStatusDto model)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Voyage non trouvé"));

        if (!TripStatusTransitions.IsValidTransition(trip.TripStatus, model.Status))
        {
            return BadRequest(new ApiResponse(false,
                $"Transition de statut invalide: {TripStatusTransitions.GetStatusLabel(trip.TripStatus)} → {TripStatusTransitions.GetStatusLabel(model.Status)}"));
        }

        var oldStatus = trip.TripStatus;
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var userName = User.FindFirstValue(ClaimTypes.Name);

        await UpdateOrderStatusesBasedOnTripStatus(trip, model.Status);
        trip.TripStatus = model.Status;

        if (model.Status == TripStatus.DeliveryInProgress && !trip.ActualStartDate.HasValue)
        {
            trip.ActualStartDate = DateTime.UtcNow;
        }

        if (model.Status == TripStatus.Receipt && !trip.ActualEndDate.HasValue)
        {
            trip.ActualEndDate = DateTime.UtcNow;
        }

        tripRepository.Update(trip);
        await context.SaveChangesAsync();

        // Send SignalR notification for status change
        var statusChange = new TripStatusChangeDto
        {
            TripId = trip.Id,
            TripReference = trip.TripReference ?? trip.BookingId,
            OldStatus = TripStatusTransitions.GetStatusLabel(oldStatus),
            NewStatus = TripStatusTransitions.GetStatusLabel(model.Status),
<<<<<<< HEAD
<<<<<<< HEAD
            DriverName = trip.Driver?.Name ?? string.Empty,
            TruckImmatriculation = trip.Truck?.Immatriculation ?? string.Empty,
=======
            DriverName = trip.Driver?.Name,
            ConvoyeurName = trip.Convoyeur?.Name,
            TruckImmatriculation = trip.Truck?.Immatriculation,
>>>>>>> dev
=======
            DriverName = trip.Driver?.Name ?? string.Empty,
            TruckImmatriculation = trip.Truck?.Immatriculation ?? string.Empty,
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            Message = model.Notes,
            ChangedAt = DateTime.UtcNow,
            ChangedBy = userName ?? userId.ToString() ?? "System"
        };

        await _notificationService.NotifyTripStatusChanged(statusChange, userId);

        return Ok(new ApiResponse(true,
            $"Statut du trajet mis à jour: {TripStatusTransitions.GetStatusLabel(model.Status)}",
            new
            {
                trip.TripStatus,
                trip.ActualStartDate,
                trip.ActualEndDate
            }));
    }

    private static readonly Dictionary<TripStatus, OrderStatus> OrderStatusMap =
    new()
    {
        [TripStatus.Planned] = OrderStatus.Planned,
        [TripStatus.Accepted] = OrderStatus.Accepted,
        [TripStatus.LoadingInProgress] = OrderStatus.LoadingInProgress,
        [TripStatus.DeliveryInProgress] = OrderStatus.DeliveryInProgress,
        [TripStatus.Receipt] = OrderStatus.Receipt,
        [TripStatus.Cancelled] = OrderStatus.Cancelled
    };

    private async Task UpdateDriverAvailabilityForTrip(int driverId, DateTime startDate, DateTime endDate, int tripId, string tripReference)
    {
        var driverAvailability = new DriverAvailability
        {
            DriverId = driverId,
            StartDate = startDate,
            EndDate = endDate,
            TripId = tripId,
            TripReference = tripReference
        };

        await context.DriverAvailabilities.AddAsync(driverAvailability);
        await context.SaveChangesAsync();
    }

    private async Task RestoreDriverAvailabilityForTrip(int driverId, DateTime startDate, DateTime endDate, string tripReference)
    {
        var driverAvailability = await context.DriverAvailabilities
            .FirstOrDefaultAsync(da => da.DriverId == driverId &&
                                   da.StartDate == startDate &&
                                   da.EndDate == endDate &&
                                   da.TripReference == tripReference);

        if (driverAvailability != null)
        {
            context.DriverAvailabilities.Remove(driverAvailability);
            await context.SaveChangesAsync();
        }
    }

    private async Task UpdateTruckAvailabilityForTrip(int truckId, DateTime startDate, DateTime endDate, string tripReference)
    {
        var truckAvailability = new TruckAvailability
        {
            TruckId = truckId,
            StartDate = startDate,
            EndDate = endDate,
            TripReference = tripReference
        };

        await context.TruckAvailabilities.AddAsync(truckAvailability);
        await context.SaveChangesAsync();
    }

    private async Task RestoreTruckAvailabilityForTrip(int truckId, DateTime startDate, DateTime endDate, string tripReference)
    {
        var truckAvailability = await context.TruckAvailabilities
            .FirstOrDefaultAsync(ta => ta.TruckId == truckId &&
                                   ta.StartDate == startDate &&
                                   ta.EndDate == endDate &&
                                   ta.TripReference == tripReference);

        if (truckAvailability != null)
        {
            context.TruckAvailabilities.Remove(truckAvailability);
            await context.SaveChangesAsync();
        }
    }

    private async Task UpdateOrderStatusesBasedOnTripStatus(Trip trip, TripStatus newStatus)
    {
        if (trip.Deliveries.Any())
        {
            var orderIds = trip.Deliveries.Select(d => d.OrderId).ToList();
            var orders = await context.Orders.Where(o => orderIds.Contains(o.Id)).ToListAsync();

            foreach (var order in orders)
            {
                if (OrderStatusMap.TryGetValue(newStatus, out var orderStatus))
                {
                    order.Status = orderStatus;
                }
            }

            await context.SaveChangesAsync();
        }
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelTrip(int id, [FromBody] CancelTripDto model)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, "Voyage non trouvé"));

        if (trip.TripStatus == TripStatus.Receipt || trip.TripStatus == TripStatus.Cancelled)
            return BadRequest(new ApiResponse(false, "Ce voyage ne peut pas être annulé"));

        // Store driver and truck info before cancellation
<<<<<<< HEAD
<<<<<<< HEAD
        var driverName = trip.Driver?.Name ?? string.Empty;
        var truckImmatriculation = trip.Truck?.Immatriculation ?? string.Empty;
=======
        var driverName = trip.Driver?.Name;
        var convoyeurName = trip.Convoyeur?.Name;
        var truckImmatriculation = trip.Truck?.Immatriculation;
>>>>>>> dev
=======
        var driverName = trip.Driver?.Name ?? string.Empty;
        var truckImmatriculation = trip.Truck?.Immatriculation ?? string.Empty;
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (trip.DriverId != 0 && trip.EstimatedStartDate.HasValue && trip.EstimatedEndDate.HasValue)
        {
            await RestoreDriverAvailabilityForTrip(trip.DriverId, trip.EstimatedStartDate.Value, trip.EstimatedEndDate.Value, trip.TripReference);
        }

        if (trip.TruckId != 0 && trip.EstimatedStartDate.HasValue && trip.EstimatedEndDate.HasValue)
        {
            await RestoreTruckAvailabilityForTrip(trip.TruckId, trip.EstimatedStartDate.Value, trip.EstimatedEndDate.Value, trip.TripReference);
        }

        if (trip.Driver != null)
        {
            trip.Driver.Status = "Disponible";
            context.Set<Driver>().Update(trip.Driver);
        }

        if (trip.Convoyeur != null)
        {
            trip.Convoyeur.Status = "Disponible";
            context.Set<Convoyeur>().Update(trip.Convoyeur);
        }

        if (trip.Truck != null)
        {
            trip.Truck.Status = "Disponible";
            context.Trucks.Update(trip.Truck);
        }

        await UpdateOrderStatusesBasedOnTripStatus(trip, TripStatus.Cancelled);

        trip.TripStatus = TripStatus.Cancelled;
        trip.Message = model.Message;
        trip.ActualEndDate ??= DateTime.UtcNow;

        tripRepository.Update(trip);

        await context.SaveChangesAsync();

        // Send SignalR notification for cancellation
        await _notificationService.NotifyTripCancelled(
          trip.Id,
          trip.TripReference ?? trip.BookingId,
          model.Message,
          driverName,
          truckImmatriculation,
          userId
        );

<<<<<<< HEAD
<<<<<<< HEAD
        return Ok(new ApiResponse(true, "Voyage annulé avec succès", trip));
=======
        return Ok(new ApiResponse(true, "Voyage annulé avec succès", new
        {
            trip.Id,
            trip.TripStatus,
            trip.Message,
            trip.ActualEndDate
        }));
    }

    private Task UpdateOrderStatusesBasedOnTripStatus(
        Trip trip,
        TripStatus newTripStatus)
    {
        if (!OrderStatusMap.TryGetValue(newTripStatus, out var orderStatus))
            return Task.CompletedTask;

        foreach (var delivery in trip.Deliveries)
        {
            delivery.Status = newTripStatus switch
            {
                TripStatus.Planned => DeliveryStatus.Pending,
                TripStatus.Accepted => DeliveryStatus.Pending,
                TripStatus.LoadingInProgress => DeliveryStatus.Pending,
                TripStatus.DeliveryInProgress => DeliveryStatus.EnRoute,
                TripStatus.Receipt => DeliveryStatus.Delivered,
                TripStatus.Cancelled => DeliveryStatus.Cancelled,
                _ => delivery.Status
            };

            if (delivery.Order != null)
            {
                delivery.Order.Status = orderStatus;
                delivery.Order.UpdatedDate = DateTime.UtcNow;

                if (orderStatus == OrderStatus.Receipt)
                {
                    delivery.Order.DeliveryDate = DateTime.UtcNow;
                }
            }
        }

        return Task.CompletedTask;
    }

    public class UpdateTripStatusDto
    {
        [Required]
        public TripStatus Status { get; set; }

        public string? Notes { get; set; }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var trip = await tripRepository.Query()
           .Include(t => t.Truck)
                .ThenInclude(t => t.TypeTruck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Deliveries)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

        if (trip.TripStatus != TripStatus.Planned)
        {
            return BadRequest(new ApiResponse(false,
                $"Impossible de supprimer un trajet avec le statut: {TripStatusTransitions.GetStatusLabel(trip.TripStatus)}. " +
                "Seuls les trajets 'Planifié' peuvent être supprimés."));
        }

        if (trip.Truck != null)
        {
            trip.Truck.Status = "Disponible";
            context.Trucks.Update(trip.Truck);
        }

        if (trip.Driver != null)
        {
            trip.Driver.Status = "Disponible";
            context.Set<Driver>().Update(trip.Driver);
        }

        if (trip.Convoyeur != null)
        {
            trip.Convoyeur.Status = "Disponible";
            context.Set<Convoyeur>().Update(trip.Convoyeur);
        }

        if (trip.DriverId != 0 && trip.EstimatedStartDate.HasValue && trip.EstimatedEndDate.HasValue)
        {
            await RestoreDriverAvailabilityForTrip(trip.DriverId,
                trip.EstimatedStartDate.Value, trip.EstimatedEndDate.Value, trip.TripReference);
        }

        if (trip.Deliveries.Any())
        {
            deliveryRepository.RemoveRange(trip.Deliveries);
        }

        await tripRepository.DeleteAsync(id);
        await context.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Trajet supprimé avec succès"));
    }

    [HttpGet("{id}/summary")]
    public async Task<IActionResult> GetTripSummary(int id)
    {
        var summary = await context.Trips
            .Where(t => t.Id == id)
            .Select(t => new TripSummaryDto
            {
                Id = t.Id,
                BookingId = t.BookingId,
                TripReference = t.TripReference,
                Status = t.TripStatus,
                EstimatedDistance = t.EstimatedDistance,
                EstimatedDuration = t.EstimatedDuration,
                EstimatedStartDate = t.EstimatedStartDate ?? DateTime.MinValue,
                EstimatedEndDate = t.EstimatedEndDate ?? DateTime.MinValue,
                ActualStartDate = t.ActualStartDate,
                ActualEndDate = t.ActualEndDate,
                TotalDeliveries = t.Deliveries.Count,
                CompletedDeliveries = t.Deliveries.Count(d => d.Status == DeliveryStatus.Delivered),
                PendingDeliveries = t.Deliveries.Count(d => d.Status == DeliveryStatus.Pending),
                FailedDeliveries = t.Deliveries.Count(d => d.Status == DeliveryStatus.Failed),
                TotalWeight = t.Deliveries.Sum(d => d.Order.Weight),
                Truck = t.Truck.Immatriculation,
                Driver = t.Driver.Name,
                Convoyeur = t.Convoyeur != null ? t.Convoyeur.Name : null
            })
            .FirstOrDefaultAsync();

        if (summary == null)
            return NotFound(new ApiResponse(false, $"Trajet {id} non trouvé"));

        return Ok(new ApiResponse(true, "Résumé du trajet récupéré", summary));
    }

    [HttpGet("{id}/deliveries")]
    public async Task<IActionResult> GetTripDeliveries(int id)
    {
        var deliveries = await context.Deliveries
            .Where(d => d.TripId == id)
            .Include(d => d.Customer)
            .Include(d => d.Order)
            .OrderBy(d => d.Sequence)
            .Select(d => new DeliveryDetailsDto
            {
                Id = d.Id,
                Sequence = d.Sequence,
                CustomerId = d.CustomerId,
                CustomerName = d.Customer.Name,
                CustomerMatricule = d.Customer.Matricule,
                OrderId = d.OrderId,
                OrderReference = d.Order.Reference,
                OrderWeight = d.Order.Weight,
                DeliveryAddress = d.DeliveryAddress,
                Geolocation = d.Geolocation,
                PlannedTime = d.PlannedTime,
                ActualArrivalTime = d.ActualArrivalTime,
                ActualDepartureTime = d.ActualDepartureTime,
                Status = d.Status,
                Notes = d.Notes
            })
            .ToListAsync();

        if (!deliveries.Any())
            return NotFound(new ApiResponse(false, $"Aucune livraison trouvée pour le trajet {id}"));

        return Ok(new ApiResponse(true, "Livraisons récupérées", deliveries));
    }


    private async Task<TripDetailsDto> GetTripByIdInternal(int id)
    {
        var trip = await tripRepository.Query()
            .Include(t => t.Truck)
                .ThenInclude(t => t.TypeTruck)
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Customer)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (trip == null) return null;

        return new TripDetailsDto
        {
            Id = trip.Id,
            TruckId = trip.TruckId,
            DriverId = trip.DriverId,
            ConvoyeurId = trip.ConvoyeurId,
            BookingId = trip.BookingId,
            TripReference = trip.TripReference,
            TripStatus = trip.TripStatus,
            EstimatedDistance = trip.EstimatedDistance,
            EstimatedDuration = trip.EstimatedDuration,
            EstimatedStartDate = trip.EstimatedStartDate ?? DateTime.MinValue,
            EstimatedEndDate = trip.EstimatedEndDate ?? DateTime.MinValue,
            ActualStartDate = trip.ActualStartDate,
            ActualEndDate = trip.ActualEndDate,
            TrajectId = trip.TrajectId,
            CreatedAt = trip.CreatedAt,
            CreatedBy = trip.CreatedById,
            UpdatedAt = trip.UpdatedAt,
            UpdatedBy = trip.UpdatedById,

            Truck = trip.Truck != null ? new TruckDto
            {
                Id = trip.Truck.Id,
                Immatriculation = trip.Truck.Immatriculation,
                MarqueTruckId = trip.Truck.MarqueTruckId,
                Color = trip.Truck.Color,
                Status = trip.Truck.Status,
                TechnicalVisitDate = trip.Truck.TechnicalVisitDate,
                DateOfFirstRegistration = trip.Truck.DateOfFirstRegistration,
                EmptyWeight = trip.Truck.EmptyWeight,
                TypeTruckId = trip.Truck.TypeTruckId,
                TypeTruck = trip.Truck.TypeTruck != null ? new TypeTruckDto
                {
                    Id = trip.Truck.TypeTruck.Id,
                    Type = trip.Truck.TypeTruck.Type,
                    Capacity = trip.Truck.TypeTruck.Capacity,

                } : null,
            } : null,

            Driver = trip.Driver != null ? new DriverDto
            {
                Id = trip.Driver.Id,
                Name = trip.Driver.Name,
                DrivingLicense = trip.Driver.DrivingLicense,
                PhoneNumber = trip.Driver.PhoneNumber,
                Status = trip.Driver.Status,
                PhoneCountry = trip.Driver.PhoneCountry
            } : null,

            Convoyeur = trip.Convoyeur != null ? new ConvoyeurDto
            {
                Id = trip.Convoyeur.Id,
                Name = trip.Convoyeur.Name,
                Matricule = trip.Convoyeur.Matricule,
                Phone = trip.Convoyeur.PhoneNumber,
                Status = trip.Convoyeur.Status,
                PhoneCountry = trip.Convoyeur.PhoneCountry
            } : null,

            Deliveries = trip.Deliveries
                .OrderBy(d => d.Sequence)
                .Select(d => new DeliveryDetailsDto
                {
                    Id = d.Id,
                    Sequence = d.Sequence,
                    CustomerId = d.CustomerId,
                    CustomerName = d.Customer?.Name,
                    CustomerMatricule = d.Customer?.Matricule,
                    OrderId = d.OrderId,
                    OrderReference = d.Order?.Reference,
                    OrderWeight = d.Order?.Weight ?? 0,
                    DeliveryAddress = d.DeliveryAddress,
                    PlannedTime = d.PlannedTime,
                    ActualArrivalTime = d.ActualArrivalTime,
                    ActualDepartureTime = d.ActualDepartureTime,
                    Status = d.Status,
                    Notes = d.Notes
                }).ToList()
        };
    }

    private async Task UpdateDriverAvailabilityForTrip(int driverId, DateTime startDate, DateTime endDate, int tripId, string tripReference)
    {
        var currentDate = startDate.Date;
        var endDateOnly = endDate.Date;

        while (currentDate <= endDateOnly)
        {
            var isWeekend = currentDate.DayOfWeek == DayOfWeek.Sunday ||
                            currentDate.DayOfWeek == DayOfWeek.Saturday;

            var isCompanyDayOff = await context.DayOffs
                .AnyAsync(d => d.Date == currentDate);

            if (!isWeekend && !isCompanyDayOff)
            {
                var existingAvailability = await context.DriverAvailabilities
                    .FirstOrDefaultAsync(da => da.DriverId == driverId && da.Date == currentDate);

                if (existingAvailability != null)
                {
                    existingAvailability.IsAvailable = false;
                    existingAvailability.IsDayOff = false;
                    existingAvailability.Reason = $"Affecté au voyage: {tripReference}";
                    existingAvailability.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var newAvailability = new DriverAvailability
                    {
                        DriverId = driverId,
                        Date = currentDate,
                        IsAvailable = false,
                        IsDayOff = false,
                        Reason = $"Affecté au voyage: {tripReference}",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };

                    await context.DriverAvailabilities.AddAsync(newAvailability);
                }
            }

            currentDate = currentDate.AddDays(1);
        }
    }

    private async Task RestoreDriverAvailabilityForTrip(int driverId, DateTime startDate, DateTime endDate, string tripReference)
    {
        var start = startDate.Date;
        var end = endDate.Date;

        var rowsToDelete = await context.DriverAvailabilities
            .Where(da =>
                da.DriverId == driverId &&
                da.Date >= start &&
                da.Date <= end &&
                da.Reason != null &&
                da.Reason.Contains($"Affecté au voyage: {tripReference}")
            )
            .ToListAsync();

        if (rowsToDelete.Any())
        {
            context.DriverAvailabilities.RemoveRange(rowsToDelete);
            await context.SaveChangesAsync();
        }
    }

    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<Trip>>> GetTrips()
    {
        return await context.Trips
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .ToListAsync();
>>>>>>> dev
=======
        return Ok(new ApiResponse(true, "Voyage annulé avec succès", trip));
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    }

    /// <summary>
    /// Get statistics for a specific date (for trip creation form)
    /// </summary>
    [HttpGet("statistics/date/{date}")]
    public async Task<IActionResult> GetDateStatistics(string date)
    {
        try
        {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            if (!DateTime.TryParseExact(date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out DateTime targetDate))
            {
                return BadRequest(new { success = false, message = "Invalid date format. Use yyyy-MM-dd." });
            }

            var dateOnly = targetDate.Date;
            var isWeekend = dateOnly.DayOfWeek == DayOfWeek.Saturday || dateOnly.DayOfWeek == DayOfWeek.Sunday;
            var dayOfWeek = GetDayName(targetDate);

            // Get all customers
            var allCustomers = await context.Customers.ToListAsync();

            // Get all orders ready for the date (using DeliveryDate or CreatedDate)
            var allOrders = await context.Orders
                .Where(o => o.DeliveryDate.HasValue && o.DeliveryDate.Value.Date == dateOnly)
                .ToListAsync();

            // Get planned trips for the date
            var plannedTrips = await context.Trips
                .Include(t => t.Deliveries)
                .Where(t => t.EstimatedStartDate == dateOnly && t.TripStatus != TripStatus.Cancelled)
                .ToListAsync();

            // Get orders already in trips
            var ordersInTrips = plannedTrips
<<<<<<< HEAD
=======
            var tripsOnDate = await context.Trips
                .Include(t => t.Deliveries)
                    .ThenInclude(d => d.Order)
                .Where(t => t.TripStatus == TripStatus.Planned &&
                           t.EstimatedStartDate.HasValue &&
                           t.EstimatedStartDate.Value.Date == targetDate.Date)
                .ToListAsync();

            var assignedOrderIds = tripsOnDate
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                .SelectMany(t => t.Deliveries)
                .Select(d => d.OrderId)
                .Distinct()
                .ToList();

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            // Get available drivers (not on weekend/holiday and not assigned)
            var availableDrivers = await context.Drivers
                .Where(d => d.IsEnable && d.Status == "Disponible")
                .ToListAsync();

            // Check driver availability records
            var driverAvailabilityRecords = await context.DriverAvailabilities
                .Where(da => da.Date.Date == dateOnly && da.IsAvailable && !da.IsDayOff)
                .Select(da => da.DriverId)
<<<<<<< HEAD
=======
            var clientsWithOrders = await context.Customers
                .Include(c => c.Orders)
                .Where(c => c.Orders.Any(o =>
                    o.Status == OrderStatus.ReadyToLoad &&
                    !assignedOrderIds.Contains(o.Id)))
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    OrdersCount = c.Orders.Count(o =>
                        o.Status == OrderStatus.ReadyToLoad &&
                        !assignedOrderIds.Contains(o.Id))
                })
                .ToListAsync();

            var totalClients = clientsWithOrders.Count;
            var totalOrders = clientsWithOrders.Sum(c => c.OrdersCount);

            var plannedTrips = await context.Trips
                .Include(t => t.Deliveries)
                .Where(t => t.TripStatus == TripStatus.Planned &&
                           t.EstimatedStartDate.HasValue &&
                           t.EstimatedStartDate.Value.Date == targetDate.Date)
                .Select(t => new
                {
                    t.Id,
                    t.TripReference,
                    DeliveriesCount = t.Deliveries.Count,
                    OrdersCount = t.Deliveries.Count,
                    TotalWeight = t.Deliveries.Sum(d => d.Order.Weight)
                })
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                .ToListAsync();

            var finalAvailableDrivers = availableDrivers
                .Where(d => driverAvailabilityRecords.Contains(d.Id) || !isWeekend)
                .ToList();

            // Get available trucks
            var availableTrucks = await context.Trucks
                .Where(t => t.Status == "Disponible")
                .ToListAsync();

            var truckAvailabilityRecords = await context.TruckAvailabilities
                .Where(ta => ta.Date.Date == dateOnly && ta.IsAvailable && !ta.IsDayOff)
                .Select(ta => ta.TruckId)
                .ToListAsync();

            var finalAvailableTrucks = availableTrucks
                .Where(t => truckAvailabilityRecords.Contains(t.Id) || !isWeekend)
                .ToList();

            // Calculate statistics
            var totalClients = allOrders.GroupBy(o => o.CustomerId).Count();
            var totalOrders = allOrders.Count;
            var plannedTripsCount = plannedTrips.Count;
<<<<<<< HEAD
<<<<<<< HEAD
            var ordersInTripsCount = ordersInTrips.Count;
            var weightInTrips = plannedTrips.Sum(t => t.Deliveries.Sum(d => d.Order != null ? d.Order.Weight : 0));
=======
            var totalOrdersInTrips = plannedTrips.Sum(t => t.OrdersCount);
            var totalWeightInTrips = plannedTrips.Sum(t => t.TotalWeight);

            // Use Set<Driver>() to get drivers from Employees table
            var disponibleDrivers = await context.Set<Driver>()
                .Where(d => d.Status == "Disponible" && d.IsEnable)
                .Where(d => !context.DriverAvailabilities
                    .Any(da => da.DriverId == d.Id &&
                               da.Date == targetDate.Date &&
                               (!da.IsAvailable || da.IsDayOff)))
                .CountAsync();
>>>>>>> dev
=======
            var ordersInTripsCount = ordersInTrips.Count;
            var weightInTrips = plannedTrips.Sum(t => t.Deliveries.Sum(d => d.Order != null ? d.Order.Weight : 0));
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

            // Check if all orders are ready (in trips)
            var allReadyOrders = totalOrders > 0 && ordersInTripsCount >= totalOrders;

<<<<<<< HEAD
<<<<<<< HEAD
            var response = new
=======
            var allTrucks = await context.Trucks.ToListAsync();

            var disponibleTrucks = await context.Trucks
                .Where(t => t.Status == "Disponible" && t.IsEnable)
                .Where(t => !context.TruckAvailabilities
                    .Any(ta => ta.TruckId == t.Id &&
                               ta.Date == targetDate.Date &&
                               !ta.IsAvailable))
                .CountAsync();

            var ordersByStatus = await context.Orders
                .GroupBy(o => o.Status)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count(),
                    TotalWeight = g.Sum(o => o.Weight)
                })
                .ToListAsync();

            var allClientsWithReadyOrders = await context.Customers
                .Include(c => c.Orders)
                .Where(c => c.Orders.Any(o => o.Status == OrderStatus.ReadyToLoad))
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    TotalOrders = c.Orders.Count(o => o.Status == OrderStatus.ReadyToLoad)
                })
                .ToListAsync();

            var allReadyOrdersCount = allClientsWithReadyOrders.Sum(c => c.TotalOrders);

            var result = new
>>>>>>> dev
=======
            var response = new
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            {
                success = true,
                data = new
                {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                    summary = new
                    {
                        totalClients,
                        totalOrders,
                        plannedTrips = plannedTripsCount,
                        disponibleDrivers = finalAvailableDrivers.Count,
                        allReadyOrders = allReadyOrders,
                        ordersInTrips = ordersInTripsCount,
                        weightInTrips,
                        disponibleTrucks = finalAvailableTrucks.Count
                    },
                    isWeekend,
                    dayOfWeek,
                    recommendations = GenerateRecommendations(totalOrders, plannedTripsCount, finalAvailableDrivers.Count, finalAvailableTrucks.Count),
<<<<<<< HEAD
                    clients = allCustomers.Select(c => new { c.Id, c.Name, c.Adress }).ToList(),
=======
                    clients = allCustomers.Select(c => new { c.Id, c.Name, c.Contact }).ToList(),
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                    plannedTripsDetails = plannedTrips.Select(t => new
                    {
                        t.Id,
                        t.TripReference,
                        t.BookingId,
                        DriverName = context.Drivers.Where(d => d.Id == t.DriverId).Select(d => d.Name).FirstOrDefault(),
                        TruckImmatriculation = context.Trucks.Where(tr => tr.Id == t.TruckId).Select(tr => tr.Immatriculation).FirstOrDefault(),
                        DeliveriesCount = t.Deliveries.Count
                    }).ToList(),
                    resourceStatus = new
                    {
                        driversAvailable = finalAvailableDrivers.Count,
                        driversNeeded = plannedTripsCount,
                        driversShortage = Math.Max(0, plannedTripsCount - finalAvailableDrivers.Count),
                        trucksAvailable = finalAvailableTrucks.Count,
                        trucksNeeded = plannedTripsCount,
                        trucksShortage = Math.Max(0, plannedTripsCount - finalAvailableTrucks.Count)
                    }
                }
<<<<<<< HEAD
=======
                    TotalClients = totalClients,
                    TotalOrdersReady = totalOrders,
                    PlannedTrips = plannedTripsCount,
                    OrdersInTrips = totalOrdersInTrips,
                    WeightInTrips = totalWeightInTrips,
                    DisponibleDrivers = disponibleDrivers,
                    AssignedDrivers = assignedDrivers,
                    DisponibleTrucks = disponibleTrucks,
                    AllReadyOrders = allReadyOrdersCount
                },

                PlannedTripsDetails = plannedTrips.Select(t => new
                {
                    t.Id,
                    t.TripReference,
                    t.DeliveriesCount,
                    t.OrdersCount,
                    t.TotalWeight
                }),

                Clients = clientsWithOrders.Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.OrdersCount
                }),

                OrderStatusBreakdown = ordersByStatus.Select(s => new
                {
                    Status = s.Status.ToString(),
                    s.Count,
                    s.TotalWeight
                }),

                AllClientsWithReadyOrders = allClientsWithReadyOrders.Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.TotalOrders
                }),

                ResourceStatus = new
                {
                    DriversDisponible = disponibleDrivers,
                    DriversNeeded = plannedTripsCount,
                    DriversShortage = Math.Max(0, plannedTripsCount - disponibleDrivers),
                    TrucksDisponible = disponibleTrucks,
                    TrucksNeeded = plannedTripsCount,
                    TrucksShortage = Math.Max(0, plannedTripsCount - disponibleTrucks)
                },

                Recommendations = GetRecommendations(
                    totalOrders,
                    plannedTripsCount,
                    disponibleDrivers,
                    assignedDrivers,
                    disponibleTrucks,
                    allReadyOrdersCount,
                    targetDate)
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            return StatusCode(500, new { success = false, message = "Error retrieving date statistics", error = ex.Message });
        }
    }

    private string GetDayName(DateTime date)
    {
        var dayNames = new[] { "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi" };
        return dayNames[(int)date.DayOfWeek];
    }

    private List<string> GenerateRecommendations(int totalOrders, int plannedTrips, int availableDrivers, int availableTrucks)
    {
        var recommendations = new List<string>();

        if (totalOrders > 0 && plannedTrips == 0)
<<<<<<< HEAD
=======
            Console.WriteLine($"Erreur statistiques date: {ex.Message}\n{ex.StackTrace}");

            var fallbackResult = new
            {
                Date = targetDate.ToString("yyyy-MM-dd"),
                FormattedDate = targetDate.ToString("dd/MM/yyyy"),
                Summary = new
                {
                    TotalClients = 0,
                    TotalOrdersReady = 0,
                    PlannedTrips = 0,
                    OrdersInTrips = 0,
                    WeightInTrips = 0m,
                    DisponibleDrivers = 0,
                    AssignedDrivers = 0,
                    DisponibleTrucks = 0,
                    AllReadyOrders = 0
                },
                Clients = new List<object>(),
                PlannedTripsDetails = new List<object>(),
                OrderStatusBreakdown = new List<object>(),
                AllClientsWithReadyOrders = new List<object>(),
                Recommendations = new List<string>()
            };

            return Ok(new ApiResponse(true, $"Statistiques pour le {targetDate:dd/MM/yyyy}", fallbackResult));
        }
    }

    private List<string> GetRecommendations(
        int ordersReady,
        int plannedTrips,
        int disponibleDrivers,
        int assignedDrivers,
        int disponibleTrucks,
        int allReadyOrders,
        DateTime date)
    {
        var recommendations = new List<string>();

        if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
        {
            recommendations.Add($"⚠️ {totalOrders} commandes prêtes mais aucun voyage planifié");
        }

<<<<<<< HEAD
<<<<<<< HEAD
        if (availableDrivers < plannedTrips)
=======
        if (ordersReady > 0 && plannedTrips == 0)
>>>>>>> dev
=======
        if (availableDrivers < plannedTrips)
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
        {
            recommendations.Add($"⚠️ Manque de chauffeurs: {plannedTrips - availableDrivers} chauffeurs nécessaires");
        }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
        if (availableTrucks < plannedTrips)
        {
            recommendations.Add($"⚠️ Manque de camions: {plannedTrips - availableTrucks} camions nécessaires");
        }

        if (totalOrders == 0)
        {
            recommendations.Add("ℹ️ Aucune commande prête pour cette date");
<<<<<<< HEAD
=======
        if (disponibleDrivers == 0 && plannedTrips > 0)
        {
            recommendations.Add("🚫 Aucun chauffeur disponible - Vérifiez les disponibilités");
        }
        else if (disponibleDrivers < plannedTrips)
        {
            var shortage = plannedTrips - disponibleDrivers;
            recommendations.Add($"👥 Manque de {shortage} chauffeur(s) - {plannedTrips} voyages vs {disponibleDrivers} disponibles");
        }
        else if (disponibleDrivers > (plannedTrips + 2))
        {
            recommendations.Add($"✅ Excédent de {disponibleDrivers - plannedTrips} chauffeur(s) - Optimisation possible");
        }

        if (disponibleTrucks == 0 && plannedTrips > 0)
        {
            recommendations.Add("🚚 Aucun camion disponible - Vérifiez le parc");
        }
        else if (disponibleTrucks < plannedTrips)
        {
            var shortage = plannedTrips - disponibleTrucks;
            recommendations.Add($"🚛 Manque de {shortage} camion(s) - {plannedTrips} voyages vs {disponibleTrucks} disponibles");
        }

        if (allReadyOrders > 50)
        {
            recommendations.Add("📈 Charge globale élevée: " + allReadyOrders + " commandes en attente au total");
        }

        if (ordersReady == 0 && plannedTrips == 0)
        {
            recommendations.Add("✅ Aucune activité planifiée pour cette date");
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
        }

        if (recommendations.Count == 0)
        {
            recommendations.Add("✅ Tout est prêt pour cette date");
        }

        return recommendations;
    }

    /// <summary>
    /// Get all trips for a specific driver (for mobile app)
    /// </summary>
    [HttpGet("driver/{driverId}")]
    public async Task<IActionResult> GetTripsByDriver(int driverId, [FromQuery] string? status = null)
    {
        try
        {
            _logger.LogInformation($"📂 GetTripsByDriver called - DriverId: {driverId}, Status: {status}");
            
            var query = context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                    .ThenInclude(d => d.Customer)
                .Where(t => t.DriverId == driverId)
                .AsQueryable();

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            // Filter by status if provided
            if (!string.IsNullOrEmpty(status))
            {
                if (status == "active")
<<<<<<< HEAD
=======
        var trip = await context.Trips
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Truck)
                .ThenInclude(t => t.TypeTruck)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Customer)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstOrDefaultAsync(t => t.Id == tripId &&
                                     t.EstimatedStartDate.HasValue &&
                                     t.EstimatedStartDate.Value.Date == targetDate.Date);

        if (trip == null)
        {
            return NotFound(new ApiResponse(false, $"Voyage non trouvé pour cette date"));
        }

        var tripStats = new
        {
            Trip = new
            {
                trip.Id,
                trip.TripReference,
                trip.TripStatus,
                Driver = trip.Driver?.Name,
                Convoyeur = trip.Convoyeur?.Name,
                Truck = trip.Truck?.Immatriculation,
                EstimatedDate = trip.EstimatedStartDate?.ToString("dd/MM/yyyy HH:mm"),
                DeliveriesCount = trip.Deliveries.Count
            },
            Deliveries = trip.Deliveries
                .OrderBy(d => d.Sequence)
                .Select(d => new
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                {
                    // Active statuses: Pending, Assigned, Accepted, Loading, InDelivery, Arrived
                    var activeStatuses = new[] {
                        TripStatus.Pending,
                        TripStatus.Assigned,
                        TripStatus.Accepted,
                        TripStatus.Loading,
                        TripStatus.InDelivery,
                        TripStatus.Arrived
                    };
                    query = query.Where(t => activeStatuses.Contains(t.TripStatus));
                }
                else if (status == "history")
                {
                    // History statuses: Completed, Cancelled, Refused
                    var historyStatuses = new[] {
                        TripStatus.Completed,
                        TripStatus.Cancelled,
                        TripStatus.Refused
                    };
                    query = query.Where(t => historyStatuses.Contains(t.TripStatus));
                }
                else if (Enum.TryParse<TripStatus>(status, out var parsedStatus))
                {
                    query = query.Where(t => t.TripStatus == parsedStatus);
                }
            }

<<<<<<< HEAD
<<<<<<< HEAD
            var allTripsCount = await query.CountAsync();
            _logger.LogInformation($"📊 Total trips found for driver {driverId}: {allTripsCount}");
=======
        return Ok(new ApiResponse(true, $"Détails du voyage {tripId}", tripStats));
    }

    private async Task RestoreTruckAvailabilityForTrip(int truckId, DateTime startDate, DateTime endDate, string tripReference)
    {
        var start = startDate.Date;
        var end = endDate.Date;
>>>>>>> dev
=======
            var allTripsCount = await query.CountAsync();
            _logger.LogInformation($"📊 Total trips found for driver {driverId}: {allTripsCount}");
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

            var trips = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.TripReference,
                    t.BookingId,
                    Status = t.TripStatus.ToString(),
                    DriverId = t.DriverId,
                    DriverName = t.Driver != null ? t.Driver.Name : null,
                    TruckId = t.TruckId,
                    TruckImmatriculation = t.Truck != null ? t.Truck.Immatriculation : null,
                    t.EstimatedDistance,
                    t.EstimatedDuration,
                    t.EstimatedStartDate,
                    t.EstimatedEndDate,
                    t.ActualStartDate,
                    t.ActualEndDate,
                    t.CreatedAt,
                    DeliveriesCount = t.Deliveries.Count,
                    Deliveries = t.Deliveries.Select(d => new
                    {
                        d.Id,
                        d.DeliveryAddress,
                        CustomerName = d.Customer != null ? d.Customer.Name : null,
                        d.OrderId,
                        d.Status
                    }).ToList(),
                    t.CurrentLatitude,
                    t.CurrentLongitude,
                    t.LastPositionUpdate
                })
                .ToListAsync();

            _logger.LogInformation($"✅ Returning {trips.Count} trips for driver {driverId}");
            if (trips.Count > 0)
            {
                _logger.LogInformation($"📦 First trip: {trips[0].TripReference}, Status: {trips[0].Status}");
            }

            return Ok(trips);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading trips for driver {DriverId}", driverId);
            return BadRequest(new { message = "Error loading driver trips", error = ex.Message });
        }
    }

    /// <summary>
    /// DEBUG: Get all trips with their driver IDs (for testing)
    /// </summary>
    [HttpGet("debug/all")]
    public async Task<IActionResult> GetAllTripsWithDrivers()
    {
        try
        {
            var trips = await context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Select(t => new
                {
                    t.Id,
                    t.TripReference,
                    t.DriverId,
                    DriverName = t.Driver != null ? t.Driver.Name : null,
                    DriverEmail = t.Driver != null ? t.Driver.Email : null,
                    t.TripStatus,
                    t.CreatedAt
                })
                .OrderByDescending(t => t.CreatedAt)
                .Take(50)
                .ToListAsync();

            return Ok(trips);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error", error = ex.Message });
        }
    }

    /// <summary>
    /// DEBUG: Fix driver user_id linkage (TEMPORARY - remove after use)
    /// </summary>
    [HttpPost("debug/fix-driver-link")]
    public async Task<IActionResult> FixDriverLink()
    {
        try
        {
            // Find driver with email anis12@tms.demo
            var driver = await context.Drivers
                .FirstOrDefaultAsync(d => d.Email == "anis12@tms.demo");

            if (driver == null)
                return NotFound(new { message = "Driver not found" });

            // Update driver's user_id to 14
            driver.user_id = 14;
            await context.SaveChangesAsync();

            return Ok(new { 
                success = true, 
                message = $"Driver {driver.Id} ({driver.Name}) linked to User 14",
                driverId = driver.Id,
                userId = driver.user_id
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error", error = ex.Message });
        }
    }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    /// <summary>
    /// DEBUG: Auto-fix ALL drivers user_id linkage (Run once after deploy)
    /// </summary>
    [HttpPost("debug/auto-fix-all-drivers")]
    public async Task<IActionResult> AutoFixAllDrivers()
<<<<<<< HEAD
=======
    private async Task UpdateTruckAvailabilityForTrip(int truckId, DateTime startDate, DateTime endDate, string tripReference)
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    {
        try
        {
            var fixedDrivers = new List<object>();

            // Find all drivers without user_id
            var driversWithoutUser = await context.Drivers
                .Where(d => d.user_id == null)
                .ToListAsync();

            foreach (var driver in driversWithoutUser)
            {
                // Find matching user by email
                var user = await context.Users
                    .FirstOrDefaultAsync(u => u.Email == driver.Email);

<<<<<<< HEAD
<<<<<<< HEAD
                if (user != null)
=======
        await context.SaveChangesAsync();
    }

    [HttpGet("list_filtered")]
    public async Task<ActionResult<IEnumerable<TripDto>>> GetTripsByDateRange(
    [FromQuery] DateTime? startDate = null,
    [FromQuery] DateTime? endDate = null,
    [FromQuery] string? status = null,
    [FromQuery] int? zoneId = null)
    {
        var query = context.Trips
            .AsNoTracking()
            .Include(t => t.Driver)
            .Include(t => t.Convoyeur)
            .Include(t => t.Truck)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Customer)
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .AsQueryable();

        if (startDate.HasValue)
        {
            var start = startDate.Value.Date;
            query = query.Where(t => t.EstimatedStartDate >= start);
        }

        if (endDate.HasValue)
        {
            var end = endDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(t => t.EstimatedStartDate <= end);
        }

        if (!string.IsNullOrEmpty(status) && status != "all")
        {
            if (Enum.TryParse<TripStatus>(status, true, out var tripStatus))
            {
                query = query.Where(t => t.TripStatus == tripStatus);
            }
        }

        var trips = await query
            .OrderByDescending(t => t.EstimatedStartDate)
            .Select(t => new TripMapDto
            {
                Id = t.Id,
                TripReference = t.TripReference,
                TripStatus = t.TripStatus.ToString(),
                EstimatedStartDate = t.EstimatedStartDate,
                EstimatedEndDate = t.EstimatedEndDate,
                EstimatedDistance = t.EstimatedDistance,
                ActualStartDate = t.ActualStartDate,
                ActualEndDate = t.ActualEndDate,

                // Driver
                DriverId = t.Driver.Id,
                DriverName = t.Driver.Name,
                DriverPhone = t.Driver.PhoneNumber,
                DriverEmail = t.Driver.Email,

                // Convoyeur
                ConvoyeurId = t.Convoyeur != null ? t.Convoyeur.Id : null,
                ConvoyeurName = t.Convoyeur != null ? t.Convoyeur.Name : null,

                // Truck
                TruckId = t.Truck.Id,
                TruckImmatriculation = t.Truck.Immatriculation,
                MarqueTruckId = t.Truck.MarqueTruckId,

                // Deliveries
                Deliveries = t.Deliveries.Select(d => new DeliveryMapDto
>>>>>>> dev
=======
                if (user != null)
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
                {
                    driver.user_id = user.Id;
                    fixedDrivers.Add(new { 
                        driverId = driver.Id, 
                        driverName = driver.Name, 
                        driverEmail = driver.Email,
                        userId = user.Id,
                        userName = user.Name
                    });
                }
            }

<<<<<<< HEAD
<<<<<<< HEAD
            await context.SaveChangesAsync();
=======
                    // Customer
                    CustomerId = d.Customer.Id,
                    CustomerName = d.Customer.Name,
                    CustomerPhone = d.Customer.Phone,
>>>>>>> dev
=======
            await context.SaveChangesAsync();
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

            return Ok(new { 
                success = true, 
                message = $"Auto-fixed {fixedDrivers.Count} drivers",
                fixedDrivers = fixedDrivers
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Error", error = ex.Message });
        }
    }
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

    /// <summary>
    /// Accept a trip - HTTP fallback for mobile (guarantees notification saved to DB)
    /// </summary>
    [HttpPost("{tripId}/accept")]
    public async Task<IActionResult> AcceptTripHttp(int tripId)
<<<<<<< HEAD
=======


    [HttpGet("today-count")]
    public async Task<ActionResult<TripCountDto>> GetTodayTripCount()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);


            var tripSettings = await context.GeneralSettings
                .Where(s => s.ParameterType == "TRIP" &&
                           s.ParameterCode.StartsWith("MAX_TRIPS_PER_DAY="))
                .FirstOrDefaultAsync();

            int maxTripsPerDay = 10;

            if (tripSettings != null)
            {
                var value = tripSettings.ParameterCode.Split('=')[1];
                int.TryParse(value, out maxTripsPerDay);
            }


            var tripsToday = await context.Trips
                .Where(t => t.CreatedAt >= today &&
                            t.CreatedAt < tomorrow)
                .CountAsync();

            var result = new TripCountDto
            {
                TripsCreatedToday = tripsToday,
                MaxTripsPerDay = maxTripsPerDay,
                HasReachedLimit = tripsToday >= maxTripsPerDay,
                Date = today.ToString("yyyy-MM-dd")
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class ApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public object? Data { get; set; }

    public ApiResponse(bool success, string message, object? data = null)
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    {
        try
        {
            _logger.LogInformation($"🔔 HTTP AcceptTrip called - tripId: {tripId}");

            var trip = await context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                .FirstOrDefaultAsync(t => t.Id == tripId);

            if (trip == null)
            {
                _logger.LogWarning($"⚠️ Trip {tripId} not found");
                return NotFound(new { success = false, message = "Trip not found" });
            }

            trip.TripStatus = TripStatus.Accepted;
            await context.SaveChangesAsync();

            _logger.LogInformation($"✅ Trip {tripId} status updated to Accepted");

            // Save notification to database for ALL admins
            var allUsers = await context.Users.ToListAsync();
            var adminUsers = allUsers.Where(u => u.Email.Contains("admin") || u.Email.Contains("super")).ToList();

            _logger.LogInformation($"📢 Saving notification for {adminUsers.Count} admins");

            foreach (var adminUser in adminUsers)
            {
                var notification = new Notification
                {
                    Type = "TRIP_ACCEPTED",
                    Title = "✅ Mission Acceptée",
                    Message = $"Le chauffeur {trip.Driver?.Name} a accepté la mission {trip.TripReference}",
                    Timestamp = DateTime.UtcNow,
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    AdditionalData = System.Text.Json.JsonSerializer.Serialize(new {
                        TripId = tripId,
                        TripReference = trip.TripReference,
                        DriverName = trip.Driver?.Name,
                        TruckImmatriculation = trip.Truck?.Immatriculation,
                        Status = "Acceptée"
                    }),
                    CreatedAt = DateTime.UtcNow
                };

                context.Notifications.Add(notification);
                _logger.LogInformation($"✅ Notification added for admin {adminUser.Email}");

                var userNotification = new UserNotification
                {
                    NotificationId = notification.Id,
                    UserId = adminUser.Id,
                    IsRead = false,
                    ReadAt = null
                };

                context.UserNotifications.Add(userNotification);
            }

            await context.SaveChangesAsync();

            _logger.LogInformation($"✅✅✅ HTTP AcceptTrip - Notification saved to DB for {adminUsers.Count} admins");

            // Also broadcast via SignalR
            var notificationData = new {
                TripId = tripId,
                TripReference = trip.TripReference,
                DriverId = trip.DriverId,
                DriverName = trip.Driver?.Name,
                TruckImmatriculation = trip.Truck?.Immatriculation,
                Status = "Acceptée",
                Timestamp = DateTime.UtcNow
            };

            await _gpsHub.Clients.All.SendAsync("TripAccepted", notificationData);
            _logger.LogInformation($"📢 SignalR TripAccepted broadcast sent to all clients");

            return Ok(new { success = true, message = "Trip accepted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Error in HTTP AcceptTrip - {ex.Message}");
            return BadRequest(new { success = false, message = ex.Message, stackTrace = ex.StackTrace });
        }
    }
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

    /// <summary>
    /// Reject a trip - HTTP fallback for mobile (guarantees notification saved to DB)
    /// </summary>
    [HttpPost("{tripId}/reject")]
    public async Task<IActionResult> RejectTripHttp(int tripId, [FromQuery] string reason, [FromQuery] string reasonCode)
    {
        try
        {
            _logger.LogInformation($"🔔 HTTP RejectTrip called - tripId: {tripId}, reason: {reason}");

            var trip = await context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .FirstOrDefaultAsync(t => t.Id == tripId);

            if (trip == null)
            {
                return NotFound(new { success = false, message = "Trip not found" });
            }

            // Update assignment
            var assignment = await context.TripAssignments
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
                context.TripAssignments.Add(assignment);
            }

            assignment.Status = AssignmentStatus.Rejected;
            assignment.RejectionReason = reason;
            assignment.RejectionReasonCode = reasonCode;
            assignment.RespondedAt = DateTime.UtcNow;

            trip.TripStatus = TripStatus.Refused;
            await context.SaveChangesAsync();

            // Save notification to database for ALL admins
            var allUsers = await context.Users.ToListAsync();
            var adminUsers = allUsers.Where(u => u.Email.Contains("admin") || u.Email.Contains("super")).ToList();

            foreach (var adminUser in adminUsers)
            {
                var notification = new Notification
                {
                    Type = "TRIP_REJECTED",
                    Title = "❌ Mission Refusée",
                    Message = $"Le chauffeur {trip.Driver?.Name} a refusé la mission {trip.TripReference}. Raison: {reason}",
                    Timestamp = DateTime.UtcNow,
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    AdditionalData = System.Text.Json.JsonSerializer.Serialize(new {
                        TripId = tripId,
                        TripReference = trip.TripReference,
                        DriverName = trip.Driver?.Name,
                        TruckImmatriculation = trip.Truck?.Immatriculation,
                        Reason = reason,
                        ReasonCode = reasonCode,
                        Status = "Refusée"
                    }),
                    CreatedAt = DateTime.UtcNow
                };

                context.Notifications.Add(notification);

                var userNotification = new UserNotification
                {
                    NotificationId = notification.Id,
                    UserId = adminUser.Id,
                    IsRead = false,
                    ReadAt = null
                };

                context.UserNotifications.Add(userNotification);
            }

            await context.SaveChangesAsync();

            _logger.LogInformation($"✅✅✅ HTTP RejectTrip - Notification saved to DB for {adminUsers.Count} admins");

            // Also broadcast via SignalR
            var notificationData = new {
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

            await _gpsHub.Clients.All.SendAsync("TripRejected", notificationData);
            _logger.LogInformation($"📢 SignalR TripRejected broadcast sent");

            return Ok(new { success = true, message = "Trip rejected successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"❌ Error in HTTP RejectTrip");
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
<<<<<<< HEAD
=======
>>>>>>> dev
=======

    /// <summary>
    /// Get trips with filters for map display (list_filtered endpoint)
    /// </summary>
    [HttpGet("list_filtered")]
    public async Task<IActionResult> GetTripsListFiltered(
        [FromQuery] string? status = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var query = context.Trips
                .Include(t => t.Driver)
                .Include(t => t.Truck)
                .Include(t => t.Deliveries)
                    .ThenInclude(d => d.Customer)
                .AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<TripStatus>(status, out var parsedStatus))
            {
                query = query.Where(t => t.TripStatus == parsedStatus);
            }

            // Filter by date range
            if (startDate.HasValue)
            {
                query = query.Where(t => t.EstimatedStartDate >= startDate.Value);
            }
            if (endDate.HasValue)
            {
                query = query.Where(t => t.EstimatedStartDate <= endDate.Value);
            }

            var trips = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.TripReference,
                    t.BookingId,
                    TripStatus = t.TripStatus.ToString(),
                    DriverId = t.DriverId,
                    DriverName = t.Driver != null ? t.Driver.Name : null,
                    TruckId = t.TruckId,
                    TruckImmatriculation = t.Truck != null ? t.Truck.Immatriculation : null,
                    t.EstimatedDistance,
                    t.EstimatedDuration,
                    t.EstimatedStartDate,
                    t.EstimatedEndDate,
                    t.CreatedAt,
                    Deliveries = t.Deliveries.Select(d => new
                    {
                        d.Id,
                        d.CustomerId,
                        CustomerName = d.Customer != null ? d.Customer.Name : null,
                        d.DeliveryAddress,
                        Status = d.Status.ToString(),
                        d.Sequence,
                        d.Geolocation
                    }).ToList()
                })
                .ToListAsync();

            return Ok(trips);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in list_filtered endpoint");
            return BadRequest(new { message = "Error loading trips", error = ex.Message });
        }
    }

    /// <summary>
    /// Get count of trips for today
    /// </summary>
    [HttpGet("today-count")]
    public async Task<IActionResult> GetTodayTripCount()
    {
        try
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            var count = await context.Trips
                .CountAsync(t => t.EstimatedStartDate >= today && t.EstimatedStartDate < tomorrow);

            return Ok(new { count = count, date = today });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in today-count endpoint");
            return BadRequest(new { message = "Error getting trip count", error = ex.Message });
        }
    }
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
}