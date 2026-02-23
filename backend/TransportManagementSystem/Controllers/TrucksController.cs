using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using System.Text.Json;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TrucksController : ControllerBase
{
    private readonly IRepository<Truck> truckRepository;
    private readonly ApplicationDbContext context;

    public TrucksController(IRepository<Truck> truckRepository, ApplicationDbContext context)
    {
        this.truckRepository = truckRepository;
        this.context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrucks([FromQuery] SearchOptions searchOption)
    {
        var query = context.Trucks
            .Include(t => t.TypeTruck)  
            .Include(t => t.Zone)        
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            var search = searchOption.Search;
            DateTime? searchDate = null;

            if (DateTime.TryParseExact(search, "dd/MM/yyyy", null,
                System.Globalization.DateTimeStyles.None, out var parsedDate))
            {
                searchDate = parsedDate.Date;
            }

            query = query.Where(x =>
                x.Immatriculation.Contains(search) ||
                x.Status.Contains(search) ||
                (searchDate.HasValue && x.TechnicalVisitDate.Date == searchDate.Value)
            );
        }

        var totalCount = await query.CountAsync();

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        var trucks = await query.ToListAsync();

        var truckDtos = trucks.Select(t => new TruckDto
        {
            Id = t.Id,
            Immatriculation = t.Immatriculation,
            MarqueTruckId = t.MarqueTruckId,
            Color = t.Color,
            Status = t.Status,
            TechnicalVisitDate = t.TechnicalVisitDate,
            DateOfFirstRegistration = t.DateOfFirstRegistration,
            EmptyWeight = t.EmptyWeight,
            TypeTruckId = t.TypeTruckId,
            ZoneId = t.ZoneId,
            Images = DeserializeImages(t.ImagesJson),
            TypeTruck = t.TypeTruck != null ? new TypeTruckDto
            {
                Id = t.TypeTruck.Id,
                Type = t.TypeTruck.Type,
                Capacity = t.TypeTruck.Capacity,
            } : null
        }).ToList();

        var pagedData = new PagedData<TruckDto>
        {
            Data = truckDtos,
            TotalData = totalCount
        };

        return Ok(pagedData);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTruckById(int id)
    {
        var truck = await context.Trucks
            .Include(t => t.TypeTruck)
            .Include(t => t.Zone)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (truck == null)
            return NotFound(new ApiResponse(false, $"Camion {id} non trouvé"));

        var truckDto = new TruckDto
        {
            Id = truck.Id,
            Immatriculation = truck.Immatriculation,
            MarqueTruckId = truck.MarqueTruckId,
            Color = truck.Color,
            Status = truck.Status,
            TechnicalVisitDate = truck.TechnicalVisitDate,
            DateOfFirstRegistration = truck.DateOfFirstRegistration,
            EmptyWeight = truck.EmptyWeight,
            TypeTruckId = truck.TypeTruckId,
            ZoneId = truck.ZoneId,
            Images = DeserializeImages(truck.ImagesJson),
            TypeTruck = truck.TypeTruck != null ? new TypeTruckDto
            {
                Id = truck.TypeTruck.Id,
                Type = truck.TypeTruck.Type,
                Capacity = truck.TypeTruck.Capacity,
            } : null
        };

        return Ok(new ApiResponse(true, "Camion récupéré avec succès", truckDto));
    }

    [HttpPost]
    public async Task<IActionResult> AddTruck([FromBody] TruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var existingTruck = await context.Trucks
            .FirstOrDefaultAsync(x => x.Immatriculation == model.Immatriculation);

        if (existingTruck != null)
            return BadRequest(new ApiResponse(false, "Un camion avec cette immatriculation existe déjà"));

        var truck = new Truck
        {
            Immatriculation = model.Immatriculation,
            TechnicalVisitDate = model.TechnicalVisitDate,
            DateOfFirstRegistration = model.DateOfFirstRegistration,
            EmptyWeight = model.EmptyWeight,
            MarqueTruckId = model.MarqueTruckId,
            Status = model.Status ?? "Disponible",
            Color = model.Color,
            ImagesJson = SerializeImages(model.Images),
            TypeTruckId = model.TypeTruckId,
            ZoneId = model.ZoneId,
            IsEnable = true
        };

        await truckRepository.AddAsync(truck);
        await truckRepository.SaveChangesAsync();

        // Load the created truck with relationships
        var createdTruck = await context.Trucks
            .Include(t => t.TypeTruck)
            .Include(t => t.Zone)
            .FirstOrDefaultAsync(t => t.Id == truck.Id);

        var truckDto = new TruckDto
        {
            Id = createdTruck.Id,
            Immatriculation = createdTruck.Immatriculation,
            MarqueTruckId = createdTruck.MarqueTruckId,
            Color = createdTruck.Color,
            Status = createdTruck.Status,
            TechnicalVisitDate = createdTruck.TechnicalVisitDate,
            DateOfFirstRegistration = createdTruck.DateOfFirstRegistration,
            EmptyWeight = createdTruck.EmptyWeight,
            TypeTruckId = createdTruck.TypeTruckId,
            ZoneId = createdTruck.ZoneId,
            Images = DeserializeImages(createdTruck.ImagesJson),
            TypeTruck = createdTruck.TypeTruck != null ? new TypeTruckDto
            {
                Id = createdTruck.TypeTruck.Id,
                Type = createdTruck.TypeTruck.Type,
                Capacity = createdTruck.TypeTruck.Capacity,
                Unit = createdTruck.TypeTruck.Unit
            } : null
        };

        return CreatedAtAction(nameof(GetTruckById), new { id = truck.Id },
            new ApiResponse(true, "Camion créé avec succès", truckDto));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTruck(int id, [FromBody] TruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var truck = await context.Trucks
            .Include(t => t.TypeTruck)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (truck == null)
            return NotFound(new ApiResponse(false, $"Camion {id} non trouvé"));

        var existingTruck = await context.Trucks
            .FirstOrDefaultAsync(x => x.Immatriculation == model.Immatriculation && x.Id != id);

        if (existingTruck != null)
            return BadRequest(new ApiResponse(false, "Un camion avec cette immatriculation existe déjà"));

        truck.Immatriculation = model.Immatriculation;
        truck.TechnicalVisitDate = model.TechnicalVisitDate;
        truck.DateOfFirstRegistration = model.DateOfFirstRegistration;
        truck.EmptyWeight = model.EmptyWeight;
        truck.MarqueTruckId = model.MarqueTruckId;
        truck.Status = model.Status;
        truck.Color = model.Color;
        truck.ImagesJson = SerializeImages(model.Images);
        truck.TypeTruckId = model.TypeTruckId;
        truck.ZoneId = model.ZoneId;

        truckRepository.Update(truck);
        await truckRepository.SaveChangesAsync();

        // Load updated truck with relationships
        var updatedTruck = await context.Trucks
            .Include(t => t.TypeTruck)
            .Include(t => t.Zone)
            .FirstOrDefaultAsync(t => t.Id == id);

        var truckDto = new TruckDto
        {
            Id = updatedTruck.Id,
            Immatriculation = updatedTruck.Immatriculation,
            MarqueTruckId = updatedTruck.MarqueTruckId,
            Color = updatedTruck.Color,
            Status = updatedTruck.Status,
            TechnicalVisitDate = updatedTruck.TechnicalVisitDate,
            DateOfFirstRegistration = updatedTruck.DateOfFirstRegistration,
            EmptyWeight = updatedTruck.EmptyWeight,
            TypeTruckId = updatedTruck.TypeTruckId,
            ZoneId = updatedTruck.ZoneId,
            Images = DeserializeImages(updatedTruck.ImagesJson),
            TypeTruck = updatedTruck.TypeTruck != null ? new TypeTruckDto
            {
                Id = updatedTruck.TypeTruck.Id,
                Type = updatedTruck.TypeTruck.Type,
                Capacity = updatedTruck.TypeTruck.Capacity,
                Unit = updatedTruck.TypeTruck.Unit
            } : null
        };

        return Ok(new ApiResponse(true, "Camion mis à jour avec succès", truckDto));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTruck(int id)
    {
        var truck = await context.Trucks.FindAsync(id);
        if (truck == null)
            return NotFound(new ApiResponse(false, $"Camion {id} non trouvé"));

        // Check if truck is used in any trips
        var hasTrips = await context.Trips.AnyAsync(t => t.TruckId == id);
        if (hasTrips)
        {
            return BadRequest(new ApiResponse(false,
                "Impossible de supprimer ce camion car il est associé à des voyages"));
        }

        await truckRepository.DeleteAsync(id);
        await truckRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Le camion a été supprimé avec succès"));
    }

    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<TruckDto>>> GetTrucksList()
    {
        var trucks = await context.Trucks
            .Include(t => t.TypeTruck)
            .Include(t => t.Zone)
            .Where(t => t.IsEnable)
            .ToListAsync();

        var truckDtos = trucks.Select(t => new TruckDto
        {
            Id = t.Id,
            Immatriculation = t.Immatriculation,
            MarqueTruckId = t.MarqueTruckId,
            Color = t.Color,
            Status = t.Status,
            TechnicalVisitDate = t.TechnicalVisitDate,
            DateOfFirstRegistration = t.DateOfFirstRegistration,
            EmptyWeight = t.EmptyWeight,
            TypeTruckId = t.TypeTruckId,
            ZoneId = t.ZoneId,
            Images = DeserializeImages(t.ImagesJson),
            TypeTruck = t.TypeTruck != null ? new TypeTruckDto
            {
                Id = t.TypeTruck.Id,
                Type = t.TypeTruck.Type,
                Capacity = t.TypeTruck.Capacity,
                Unit = t.TypeTruck.Unit
            } : null
        }).ToList();

        return Ok(truckDtos);
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableTrucks(
        [FromQuery] string date,
        [FromQuery] int? excludeTripId = null)
    {
        if (!DateTime.TryParse(date, out var targetDate))
            return BadRequest(new ApiResponse(false, "Format de date invalide"));

        try
        {
            var targetDay = targetDate.Date;

            var isWeekend = targetDay.DayOfWeek == DayOfWeek.Saturday ||
                            targetDay.DayOfWeek == DayOfWeek.Sunday;

            var isDayOff = await context.DayOffs
                .AnyAsync(d => d.Date.Date == targetDay);

            var allTrucks = await context.Trucks
                .Include(t => t.TypeTruck)
                .Where(t => t.IsEnable)
                .ToListAsync();

            var assignedTruckIds = await context.Trips
                .Where(t => t.TripStatus != TripStatus.Cancelled &&
                            t.TripStatus != TripStatus.Receipt &&
                            t.TruckId != 0 &&
                            t.EstimatedStartDate.HasValue &&
                            t.EstimatedEndDate.HasValue &&
                            targetDay >= t.EstimatedStartDate.Value.Date &&
                            targetDay <= t.EstimatedEndDate.Value.Date)
                .Where(t => !excludeTripId.HasValue || t.Id != excludeTripId.Value)
                .Select(t => t.TruckId)
                .Distinct()
                .ToListAsync();

            var unavailableTruckIds = await context.TruckAvailabilities
                .Where(ta => ta.Date == targetDay && !ta.IsAvailable)
                .Select(ta => ta.TruckId)
                .Distinct()
                .ToListAsync();

            var allUnavailableIds = assignedTruckIds
                .Concat(unavailableTruckIds)
                .Distinct()
                .ToList();

            var availableTrucks = (isWeekend || isDayOff)
                ? new List<object>()
                : allTrucks
                    .Where(t => !allUnavailableIds.Contains(t.Id))
                    .Select(t => new
                    {
                        t.Id,
                        t.Immatriculation,
                        t.MarqueTruckId,
                        TypeTruck = t.TypeTruck != null ? new
                        {
                            t.TypeTruck.Id,
                            t.TypeTruck.Type,
                            t.TypeTruck.Capacity,
                            t.TypeTruck.Unit
                        } : null,
                        t.TypeTruckId,
                        t.Status,
                        t.Color,
                        t.TechnicalVisitDate,
                        t.DateOfFirstRegistration,
                        t.EmptyWeight,
                        t.ZoneId
                    })
                    .ToList<object>();

            var unavailableTrucks = allTrucks
                .Where(t => isWeekend ||
                            isDayOff ||
                            allUnavailableIds.Contains(t.Id))
                .Select(t => new
                {
                    t.Id,
                    t.Immatriculation,
                    t.MarqueTruckId,
                    reason = isWeekend ? "Weekend" :
                             isDayOff ? "Jour férié" :
                             assignedTruckIds.Contains(t.Id) ? "Assigné à un autre voyage" :
                             unavailableTruckIds.Contains(t.Id) ? "Indisponible / maintenance" :
                             "Non disponible",
                    status = assignedTruckIds.Contains(t.Id) ? "En mission" : t.Status
                })
                .ToList();

            return Ok(new ApiResponse(true, "Available trucks retrieved", new
            {
                date = targetDay.ToString("yyyy-MM-dd"),
                isWeekend,
                isDayOff,
                availableTrucks,
                unavailableTrucks,
                totalAvailable = availableTrucks.Count,
                totalUnavailable = unavailableTrucks.Count
            }));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse(false, $"Error: {ex.Message}"));
        }
    }

    // Helper methods for image serialization
    private static string? SerializeImages(List<string>? images)
    {
        if (images == null || images.Count == 0)
            return null;

        return JsonSerializer.Serialize(images);
    }

    private static List<string>? DeserializeImages(string? imagesJson)
    {
        if (string.IsNullOrWhiteSpace(imagesJson))
            return new List<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(imagesJson) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }
}