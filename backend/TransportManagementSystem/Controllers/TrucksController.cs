using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

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
        var pagedData = new PagedData<Truck>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await truckRepository.GetAll();
        }
        else
        {
            DateTime? searchDate = null;

            if (DateTime.TryParseExact(searchOption.Search, "dd/MM/yyyy", null, System.Globalization.DateTimeStyles.None, out var parsedDate))
            {
                searchDate = parsedDate.Date;
            }

            pagedData.Data = await truckRepository.GetAll(x =>
                x.Brand.Contains(searchOption.Search) ||
                x.Immatriculation.Contains(searchOption.Search) ||
                x.Status.Contains(searchOption.Search) ||
                x.Capacity.ToString().Contains(searchOption.Search) ||
                (searchDate.HasValue && x.TechnicalVisitDate.Date == searchDate.Value)
            );
        }

        pagedData.TotalData = pagedData.Data.Count;

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            pagedData.Data = pagedData.Data
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value)
                .ToList();
        }

        return Ok(pagedData);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTruckById(int id)
    {
        var truck = await truckRepository.FindByIdAsync(id);
        if (truck == null)
        {
            return NotFound();
        }
        return Ok(truck);
    }

    [HttpPost]
    public async Task<IActionResult> AddTruck([FromBody] TruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var existingTruck = (await truckRepository.GetAll(x => x.Immatriculation == model.Immatriculation))
                            .FirstOrDefault();

        if (existingTruck != null)
            return BadRequest("Un camion avec cette immatriculation existe déjà");

        var truck = new Truck
        {
            Immatriculation = model.Immatriculation,
            Capacity = model.Capacity,
            TechnicalVisitDate = model.TechnicalVisitDate,
            Brand = model.Brand,
            Status = model.Status,
            Color = model.Color,
            ImageBase64 = model.ImageBase64,
            CapacityUnit = model.CapacityUnit,
            ZoneId= model.ZoneId
        };

        await truckRepository.AddAsync(truck);
        await truckRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTruckById), new { id = truck.Id }, truck);
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTruck(int id, [FromBody] TruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var truck = await truckRepository.FindByIdAsync(id);
        if (truck == null)
            return NotFound();

        var existingTruck = (await truckRepository.GetAll(x =>
                    x.Immatriculation == model.Immatriculation && x.Id != id))
                    .FirstOrDefault();

        if (existingTruck != null)
            return BadRequest("Un camion avec cette immatriculation existe déjà");

        truck.Immatriculation = model.Immatriculation;
        truck.Capacity = model.Capacity;
        truck.TechnicalVisitDate = model.TechnicalVisitDate;
        truck.Brand = model.Brand;
        truck.Status = model.Status;
        truck.Color = model.Color;
        truck.ImageBase64 = model.ImageBase64;
        truck.CapacityUnit = model.CapacityUnit;
        truck.ZoneId= model.ZoneId;

        truckRepository.Update(truck);
        await truckRepository.SaveChangesAsync();

        return Ok(truck);
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTruck(int id)
    {
        var truck = await truckRepository.FindByIdAsync(id);
        if (truck == null)
            return NotFound();

        await truckRepository.DeleteAsync(id);
        await truckRepository.SaveChangesAsync();

        return Ok(new { message = "Le camion a été supprimé avec succès" });
    }

    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<Truck>>> GetTrucksList()
    {
        var trucks = await truckRepository.GetAll();
        return Ok(trucks);
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
                        t.Brand,
                        t.Capacity,
                        t.CapacityUnit,
                        t.Status,
                        t.Color,
                        t.TechnicalVisitDate,
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
                    t.Brand,
                    reason =
                        isWeekend ? "Weekend" :
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

}
