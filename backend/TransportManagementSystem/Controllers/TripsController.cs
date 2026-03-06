using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
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

    public TripsController(
        IRepository<Trip> tripRepository,
        IRepository<Delivery> deliveryRepository,
        ApplicationDbContext context,
        INotificationService notificationService)
    {
        this.tripRepository = tripRepository;
        this.deliveryRepository = deliveryRepository;
        this.context = context;
        this._notificationService = notificationService;
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
                t.Deliveries.Any(d =>
                    d.Customer != null &&
                    d.Customer.Name.Contains(search)
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
                    d.Customer.Name.Contains(customerName)
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
                ? query.OrderBy(t => t.Truck.Immatriculation)
                : query.OrderByDescending(t => t.Truck.Immatriculation),

            "driver" => ascending
                ? query.OrderBy(t => t.Driver.Name)
                : query.OrderByDescending(t => t.Driver.Name),

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
                    : null
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
                DrivingLicense =  trip.Driver.DrivingLicense,
                PhoneNumber = trip.Driver.PhoneNumber,
                Status = trip.Driver.Status,
                PhoneCountry = trip.Driver.PhoneCountry
            } : null,

            Convoyeur = trip.Convoyeur != null ? new ConvoyeurDto
            {
                Id = trip.Convoyeur.Id,
                Name = trip.Convoyeur.Name,
                Matricule = trip.Convoyeur.Matricule,
                Phone =  trip.Convoyeur.PhoneNumber,
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

        // Use Set<Driver>() to get driver from Employees table
        var driver = await context.Set<Driver>().FindAsync(model.DriverId);
        if (driver == null)
            return BadRequest(new ApiResponse(false, "Chauffeur non trouvé"));

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

        var createdTrip = await GetTripByIdInternal(trip.Id);
        //await _notificationService.NotifyNewTripCreated(trip.Id, trip.TripReference ?? trip.BookingId, userId);

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
            DriverName = trip.Driver?.Name,
            ConvoyeurName = trip.Convoyeur?.Name,
            TruckImmatriculation = trip.Truck?.Immatriculation,
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
        var driverName = trip.Driver?.Name;
        var convoyeurName = trip.Convoyeur?.Name;
        var truckImmatriculation = trip.Truck?.Immatriculation;
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
                DrivingLicense =  trip.Driver.DrivingLicense,
                PhoneNumber =  trip.Driver.PhoneNumber,
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
    }

    [HttpGet("statistics/date/{date}")]
    public async Task<IActionResult> GetDateStatistics(string date)
    {
        if (!DateTime.TryParse(date, out var targetDate))
        {
            return BadRequest(new ApiResponse(false, "Format de date invalide. Utilisez yyyy-MM-dd"));
        }

        try
        {
            var tripsOnDate = await context.Trips
                .Include(t => t.Deliveries)
                    .ThenInclude(d => d.Order)
                .Where(t => t.TripStatus == TripStatus.Planned &&
                           t.EstimatedStartDate.HasValue &&
                           t.EstimatedStartDate.Value.Date == targetDate.Date)
                .ToListAsync();

            var assignedOrderIds = tripsOnDate
                .SelectMany(t => t.Deliveries)
                .Where(d => d.Order != null)
                .Select(d => d.Order.Id)
                .Distinct()
                .ToList();

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
                .ToListAsync();

            var plannedTripsCount = plannedTrips.Count;
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

            var assignedDrivers = await context.Trips
                .Include(t => t.Driver)
                .Where(t => t.TripStatus == TripStatus.Planned &&
                           t.EstimatedStartDate.HasValue &&
                           t.EstimatedStartDate.Value.Date == targetDate.Date &&
                           t.DriverId != 0)
                .Select(t => t.DriverId)
                .Distinct()
                .CountAsync();

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
            {
                Date = targetDate.ToString("yyyy-MM-dd"),
                FormattedDate = targetDate.ToString("dd/MM/yyyy"),
                DayOfWeek = targetDate.ToString("dddd"),
                IsWeekend = targetDate.DayOfWeek == DayOfWeek.Saturday || targetDate.DayOfWeek == DayOfWeek.Sunday,

                Summary = new
                {
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
            };

            return Ok(new ApiResponse(true, $"Statistiques pour le {targetDate:dd/MM/yyyy}", result));
        }
        catch (Exception ex)
        {
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
        {
            recommendations.Add("⚠️ Jour de weekend - Vérifiez les disponibilités des chauffeurs");
        }

        if (ordersReady > 0 && plannedTrips == 0)
        {
            recommendations.Add($"📦 {ordersReady} commande(s) prête(s) - Créez un nouveau voyage");
        }
        else if (ordersReady > 0 && ordersReady > (plannedTrips * 5))
        {
            recommendations.Add($"📊 Charge élevée: {ordersReady} commandes pour {plannedTrips} voyages - Pensez à ajouter un voyage");
        }

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
        }

        if (recommendations.Count == 0)
        {
            recommendations.Add("✅ Situation optimale - Toutes les ressources sont bien allouées");
        }

        return recommendations;
    }

    [HttpGet("statistics/date/{date}/trip/{tripId}")]
    public async Task<IActionResult> GetTripStatisticsForDate(int tripId, string date)
    {
        if (!DateTime.TryParse(date, out var targetDate))
        {
            return BadRequest(new ApiResponse(false, "Format de date invalide"));
        }

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
                {
                    d.Sequence,
                    Customer = d.Customer?.Name,
                    Order = d.Order?.Reference,
                    Weight = d.Order?.Weight,
                    Address = d.DeliveryAddress,
                    PlannedTime = d.PlannedTime?.ToString("HH:mm")
                }),
            Summary = new
            {
                TotalWeight = trip.Deliveries.Sum(d => d.Order.Weight),
                TotalOrders = trip.Deliveries.Count,
                CustomersCount = trip.Deliveries.Select(d => d.CustomerId).Distinct().Count()
            }
        };

        return Ok(new ApiResponse(true, $"Détails du voyage {tripId}", tripStats));
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

    private async Task UpdateTruckAvailabilityForTrip(int truckId, DateTime startDate, DateTime endDate, string tripReference)
    {
        var dates = Enumerable.Range(0, (endDate.Date - startDate.Date).Days + 1)
            .Select(d => startDate.Date.AddDays(d));

        foreach (var date in dates)
        {
            var ta = new TruckAvailability
            {
                TruckId = truckId,
                Date = date,
                IsAvailable = false,
                Reason = $"Affecté au voyage: {tripReference}"
            };
            await context.TruckAvailabilities.AddAsync(ta);
        }

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
                {
                    Id = d.Id,
                    Sequence = d.Sequence,
                    DeliveryAddress = d.DeliveryAddress,
                    Status = d.Status.ToString(),
                    PlannedTime = d.PlannedTime,
                    ActualArrivalTime = d.ActualArrivalTime,
                    Notes = d.Notes,

                    // Customer
                    CustomerId = d.Customer.Id,
                    CustomerName = d.Customer.Name,
                    CustomerPhone = d.Customer.Phone,

                    // Order
                    OrderId = d.Order.Id,
                    OrderReference = d.Order.Reference,
                    OrderWeight = d.Order.Weight,
                    OrderStatus = d.Order.Status.ToString()
                }).ToList()
            })
            .ToListAsync();

        return Ok(trips);
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