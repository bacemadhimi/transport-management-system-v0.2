using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Services;
using TransportManagementSystem.Hubs;
using Microsoft.AspNetCore.SignalR;
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
    private readonly NotificationHubService _notificationHubService;
    private readonly IHubContext<GPSHub> _gpsHub;
    private readonly ILogger<TripsController> _logger;

    public TripsController(
        IRepository<Trip> tripRepository,
        IRepository<Delivery> deliveryRepository,
        ApplicationDbContext context,
        INotificationService notificationService,
        NotificationHubService notificationHubService,
        IHubContext<GPSHub> gpsHub,
        ILogger<TripsController> logger)
    {
        this.tripRepository = tripRepository;
        this.deliveryRepository = deliveryRepository;
        this.context = context;
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
                (t.Truck != null && t.Truck.Immatriculation.Contains(search)) ||
                (t.Driver != null && t.Driver.Name.Contains(search)) ||
                (t.Convoyeur != null && t.Convoyeur.Name.Contains(search)) ||
                (t.Truck != null && t.Truck.Immatriculation != null ? t.Truck.Immatriculation.Contains(search) : false) ||
                (t.Driver != null && t.Driver.Name != null ? t.Driver.Name.Contains(search) : false) ||
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
                ? query.OrderBy(t => t.Convoyeur.Name)
                : query.OrderByDescending(t => t.Convoyeur.Name),

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

                Truck = t.Truck != null ? t.Truck.Immatriculation : null,
                Driver = t.Driver != null ? t.Driver.Name : null,
                Convoyeur = t.Convoyeur != null ? t.Convoyeur.Name : null,

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
                    CustomerName = d.Customer?.Name ?? string.Empty,
                    CustomerMatricule = d.Customer?.Matricule ?? string.Empty,
                    OrderId = d.OrderId,
                    OrderReference = d.Order?.Reference ?? string.Empty,
                    OrderWeight = d.Order?.Weight ?? 0,
                    DeliveryAddress = d.DeliveryAddress ?? string.Empty,
                    Geolocation = d.Geolocation,
                    Latitude = d.Location != null ? d.Location.Latitude : (double?)null,
                    Longitude = d.Location != null ? d.Location.Longitude : (double?)null,
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

        var driver = await context.Set<Driver>().FindAsync(model.DriverId);
        if (driver == null)
            return BadRequest(new ApiResponse(false, "Chauffeur non trouvé"));

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

        truck.Status = "En mission";
        driver.Status = "En mission";
        context.Trucks.Update(truck);
        context.Set<Driver>().Update(driver);

        await UpdateDriverAvailabilityForTrip(model.DriverId, model.EstimatedStartDate, model.EstimatedEndDate, trip.Id, tripReference);
        await UpdateTruckAvailabilityForTrip(model.TruckId, model.EstimatedStartDate, model.EstimatedEndDate, tripReference);

        if (model.Deliveries?.Any() == true)
        {
            var deliveries = model.Deliveries.Select(d => new Delivery
            {
                TripId = trip.Id,
                CustomerId = d.CustomerId,
                OrderId = d.OrderId,
                DeliveryAddress = d.DeliveryAddress,
                Geolocation = d.Geolocation,
                Sequence = d.Sequence,
                PlannedTime = d.PlannedTime,
                Status = DeliveryStatus.Pending,
                Notes = d.Notes
            });

            await deliveryRepository.AddRangeAsync(deliveries);
        }

        await context.SaveChangesAsync();

        var tripWithDeliveries = await context.Trips
            .Include(t => t.Deliveries)
                .ThenInclude(d => d.Order)
            .FirstAsync(t => t.Id == trip.Id);

        await UpdateOrderStatusesBasedOnTripStatus(tripWithDeliveries, TripStatus.Planned);
        await context.SaveChangesAsync();

        // Send notification to driver
        try
        {
            _logger.LogInformation($"📢 START sending notification for trip {trip.TripReference} to driver {model.DriverId}");

            var firstDelivery = tripWithDeliveries.Deliveries.FirstOrDefault();
            var lastDelivery = tripWithDeliveries.Deliveries.LastOrDefault();
            var destination = lastDelivery?.DeliveryAddress ?? "Non définie";
            var customerName = firstDelivery?.Customer?.Name ?? "Inconnu";

            var driverUser = await context.Users
                .FirstOrDefaultAsync(u => u.Email == driver.Email);

            int userIdForNotification = driverUser?.Id ?? model.DriverId;
            _logger.LogInformation($"🔍 Driver {model.DriverId} ({driver.Email}) -> User ID: {userIdForNotification}");

            var notification = new
            {
                type = "NEW_TRIP_ASSIGNMENT",
                title = "Nouvelle Mission",
                message = $"Trip {trip.TripReference} assigné - Destination: {destination}",
                tripId = trip.Id,
                tripReference = trip.TripReference,
                assignmentId = (int?)null,
                driverId = model.DriverId,
                driverName = driver.Name,
                truckImmatriculation = truck.Immatriculation,
                destination = destination,
                customerName = customerName,
                deliveriesCount = tripWithDeliveries.Deliveries.Count,
                estimatedDistance = trip.EstimatedDistance,
                estimatedDuration = trip.EstimatedDuration,
                estimatedStartDate = trip.EstimatedStartDate,
                estimatedEndDate = trip.EstimatedEndDate,
                timestamp = DateTime.UtcNow
            };

            _logger.LogInformation($"📨 Sending notification via NotificationHubService to User ID {userIdForNotification}");
            await _notificationHubService.SendTripAssignment(userIdForNotification, notification);
            _logger.LogInformation($"✅ NOTIFICATION SENT ONLY to driver {model.DriverId} (User ID: {userIdForNotification}) for trip {trip.TripReference}");
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

        var nonEditableStatuses = new[]
        {
            TripStatus.Accepted,
            TripStatus.LoadingInProgress,
            TripStatus.DeliveryInProgress,
            TripStatus.Receipt,
            TripStatus.Cancelled
        };

        if (nonEditableStatuses.Contains(trip.TripStatus))
            return BadRequest(new ApiResponse(false,
                $"Impossible de modifier un trajet avec le statut: {TripStatusTransitions.GetStatusLabel(trip.TripStatus)}. " +
                "Seuls les trajets 'Planifié' peuvent être modifiés."));

        var oldDriverId = trip.DriverId;
        var oldConvoyeurId = trip.ConvoyeurId;
        var oldTruckId = trip.TruckId;
        var oldStartDate = trip.EstimatedStartDate;
        var oldEndDate = trip.EstimatedEndDate;

        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

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

                var oldDriver = await context.Set<Driver>().FindAsync(oldDriverId);
                if (oldDriver != null)
                {
                    oldDriver.Status = "Disponible";
                    context.Set<Driver>().Update(oldDriver);
                }
            }

            var newDriver = await context.Set<Driver>().FindAsync(model.DriverId);
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
                await RestoreDriverAvailabilityForTrip(model.DriverId, oldStartDate.Value, oldEndDate.Value, trip.TripReference);
                await UpdateDriverAvailabilityForTrip(model.DriverId, model.EstimatedStartDate, model.EstimatedEndDate, trip.Id, trip.TripReference);
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
                await RestoreTruckAvailabilityForTrip(model.TruckId, oldStartDate.Value, oldEndDate.Value, trip.TripReference);
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
                Geolocation = d.Geolocation,
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

        return Ok(new ApiResponse(true, $"Trajet {id} mis à jour avec succès", updatedTrip));
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
            DriverName = trip.Driver?.Name ?? string.Empty,
            TruckImmatriculation = trip.Truck?.Immatriculation ?? string.Empty,
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

        await context.SaveChangesAsync();
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

    private async Task UpdateTruckAvailabilityForTrip(int truckId, DateTime startDate, DateTime endDate, string tripReference)
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
                var existingAvailability = await context.TruckAvailabilities
                    .FirstOrDefaultAsync(ta => ta.TruckId == truckId && ta.Date == currentDate);

                if (existingAvailability != null)
                {
                    existingAvailability.IsAvailable = false;
                    existingAvailability.Reason = $"Affecté au voyage: {tripReference}";
                    existingAvailability.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var newAvailability = new TruckAvailability
                    {
                        TruckId = truckId,
                        Date = currentDate,
                        IsAvailable = false,
                        Reason = $"Affecté au voyage: {tripReference}",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };

                    await context.TruckAvailabilities.AddAsync(newAvailability);
                }
            }

            currentDate = currentDate.AddDays(1);
        }

        await context.SaveChangesAsync();
    }

    private async Task RestoreTruckAvailabilityForTrip(int truckId, DateTime startDate, DateTime endDate, string tripReference)
    {
        var start = startDate.Date;
        var end = endDate.Date;

        var rowsToDelete = await context.TruckAvailabilities
            .Where(ta =>
                ta.TruckId == truckId &&
                ta.Date >= start &&
                ta.Date <= end &&
                ta.Reason != null &&
                ta.Reason.Contains($"Affecté au voyage: {tripReference}")
            )
            .ToListAsync();

        if (rowsToDelete.Any())
        {
            context.TruckAvailabilities.RemoveRange(rowsToDelete);
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

        var driverName = trip.Driver?.Name ?? string.Empty;
        var truckImmatriculation = trip.Truck?.Immatriculation ?? string.Empty;
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

        return Ok(new ApiResponse(true, "Voyage annulé avec succès", new
        {
            trip.Id,
            trip.TripStatus,
            trip.Message,
            trip.ActualEndDate
        }));
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

    [HttpGet("list_filtered")]
    public async Task<ActionResult<IEnumerable<TripMapDto>>> GetTripsByDateRange(
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

                DriverId = t.Driver.Id,
                DriverName = t.Driver.Name,
                DriverPhone = t.Driver.PhoneNumber,
                DriverEmail = t.Driver.Email,

                ConvoyeurId = t.Convoyeur != null ? t.Convoyeur.Id : null,
                ConvoyeurName = t.Convoyeur != null ? t.Convoyeur.Name : null,

                TruckId = t.Truck.Id,
                TruckImmatriculation = t.Truck.Immatriculation,
                MarqueTruckId = t.Truck.MarqueTruckId,

                Deliveries = t.Deliveries.Select(d => new DeliveryMapDto
                {
                    Id = d.Id,
                    Sequence = d.Sequence,
                    DeliveryAddress = d.DeliveryAddress,
                    Status = d.Status.ToString(),
                    PlannedTime = d.PlannedTime,
                    ActualArrivalTime = d.ActualArrivalTime,
                    Notes = d.Notes,

                    CustomerId = d.Customer.Id,
                    CustomerName = d.Customer.Name,
                    CustomerPhone = d.Customer.Phone,

                    OrderId = d.Order.Id,
                    OrderReference = d.Order.Reference,
                    OrderWeight = d.Order.Weight,
                    OrderStatus = d.Order.Status.ToString()
                }).ToList()
            })
            .ToListAsync();

        return Ok(trips);
    }

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

    public class UpdateTripStatusDto
    {
        [Required]
        public TripStatus Status { get; set; }

        public string? Notes { get; set; }
    }
}

public class ApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public object? Data { get; set; }

    public ApiResponse(bool success, string message, object? data = null)
    {
        Success = success;
        Message = message;
        Data = data;
    }
}