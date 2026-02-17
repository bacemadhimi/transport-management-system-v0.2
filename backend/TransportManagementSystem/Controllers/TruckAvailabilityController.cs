using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TruckAvailabilityController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public TruckAvailabilityController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTruckAvailabilities(
        [FromQuery] string startDate,
        [FromQuery] string endDate)
    {
        try
        {
            var start = DateTime.ParseExact(startDate, "yyyy-MM-dd", null);
            var end = DateTime.ParseExact(endDate, "yyyy-MM-dd", null);

            var trucks = await _context.Trucks
                .Where(t => t.IsEnable)
                .OrderBy(t => t.Immatriculation)
                .ToListAsync();

            var truckIds = trucks.Select(t => t.Id).ToList();

            var availabilities = await _context.TruckAvailabilities
                .Where(a => truckIds.Contains(a.TruckId) &&
                            a.Date >= start && a.Date <= end)
                .ToListAsync();

            var companyDayOffs = await _context.DayOffs
                .Where(d => d.Date >= start && d.Date <= end)
                .Select(d => d.Date)
                .ToListAsync();

            var result = new List<TruckAvailabilityDto>();

            foreach (var truck in trucks)
            {
                var dto = new TruckAvailabilityDto
                {
                    TruckId = truck.Id,
                    Immatriculation = truck.Immatriculation,
                    Brand = truck.Brand,
                    Availability = new Dictionary<string, AvailabilityDayDto>()
                };

                for (var date = start; date <= end; date = date.AddDays(1))
                {
                    var existing = availabilities.FirstOrDefault(a =>
                        a.TruckId == truck.Id && a.Date.Date == date.Date);

                    bool isWeekend = date.DayOfWeek == DayOfWeek.Saturday ||
                                     date.DayOfWeek == DayOfWeek.Sunday;
                    bool isCompanyDayOff = companyDayOffs.Contains(date.Date);
                    bool isDayOff = isWeekend || isCompanyDayOff;

                    bool isAvailable = isDayOff
                        ? false
                        : existing?.IsAvailable ?? true;

                    dto.Availability[date.ToString("yyyy-MM-dd")] = new AvailabilityDayDto
                    {
                        IsAvailable = isAvailable,
                        IsDayOff = isDayOff,
                        Reason = isWeekend ? "Weekend" :
                                 isCompanyDayOff ? "Company holiday" :
                                 existing?.Reason ?? ""
                    };
                }

                result.Add(dto);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error while retrieving truck availability",
                error = ex.Message
            });
        }
    }


    [HttpPost("{truckId}")]
    public async Task<IActionResult> UpdateTruckAvailability(
        int truckId,
        [FromBody] UpdateTruckAvailabilityDto dto)
    {
        try
        {
            var truck = await _context.Trucks.FindAsync(truckId);
            if (truck == null)
                return NotFound($"Truck with ID {truckId} not found.");

            var date = DateTime.ParseExact(dto.Date, "yyyy-MM-dd", null);

            bool isWeekend = date.DayOfWeek == DayOfWeek.Saturday ||
                             date.DayOfWeek == DayOfWeek.Sunday;

            bool isCompanyDayOff = await _context.DayOffs
                .AnyAsync(d => d.Date == date);

            if (isWeekend || isCompanyDayOff)
            {
                return BadRequest("Cannot modify availability on weekend or company holiday.");
            }

            var availability = await _context.TruckAvailabilities
                .FirstOrDefaultAsync(a => a.TruckId == truckId && a.Date == date);

            if (availability != null)
            {
                availability.IsAvailable = dto.IsAvailable;
                availability.IsDayOff = dto.IsDayOff;
                availability.Reason = dto.Reason;
                availability.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                await _context.TruckAvailabilities.AddAsync(new TruckAvailability
                {
                    TruckId = truckId,
                    Date = date,
                    IsAvailable = dto.IsAvailable,
                    IsDayOff = dto.IsDayOff,
                    Reason = dto.Reason,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Truck availability updated for {date:yyyy-MM-dd}",
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Error updating truck availability",
                error = ex.Message
            });
        }
    }


    [HttpPost("Initialize/{truckId}")]
    public async Task<IActionResult> InitializeTruckAvailability(
        int truckId,
        [FromBody] List<string> dates)
    {
        try
        {
            var truck = await _context.Trucks.FindAsync(truckId);
            if (truck == null)
                return NotFound("Truck not found");

            var dateList = dates
                .Select(d => DateTime.ParseExact(d, "yyyy-MM-dd", null))
                .ToList();

            var companyDayOffs = await _context.DayOffs
                .Where(d => dateList.Contains(d.Date))
                .Select(d => d.Date)
                .ToListAsync();

            var existingDates = await _context.TruckAvailabilities
                .Where(a => a.TruckId == truckId && dateList.Contains(a.Date))
                .Select(a => a.Date)
                .ToListAsync();

            var newDates = dateList.Where(d => !existingDates.Contains(d)).ToList();

            var newAvailabilities = newDates.Select(date =>
            {
                bool isWeekend = date.DayOfWeek == DayOfWeek.Saturday ||
                                 date.DayOfWeek == DayOfWeek.Sunday;
                bool isCompanyDayOff = companyDayOffs.Contains(date);

                return new TruckAvailability
                {
                    TruckId = truckId,
                    Date = date,
                    IsAvailable = !isWeekend && !isCompanyDayOff,
                    IsDayOff = isWeekend || isCompanyDayOff,
                    Reason = isWeekend ? "Weekend" :
                             isCompanyDayOff ? "Company holiday" : "",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }).ToList();

            if (newAvailabilities.Any())
            {
                await _context.TruckAvailabilities.AddRangeAsync(newAvailabilities);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = "Truck availability initialized",
                initializedCount = newAvailabilities.Count
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Initialization error",
                error = ex.Message
            });
        }
    }


    [HttpGet("Check/{truckId}")]
    public async Task<IActionResult> CheckTruckAvailability(
        int truckId,
        [FromQuery] string date)
    {
        try
        {
            var checkDate = DateTime.ParseExact(date, "yyyy-MM-dd", null);

            var availability = await _context.TruckAvailabilities
                .FirstOrDefaultAsync(a =>
                    a.TruckId == truckId &&
                    a.Date.Date == checkDate.Date);

            bool isWeekend = checkDate.DayOfWeek == DayOfWeek.Saturday ||
                             checkDate.DayOfWeek == DayOfWeek.Sunday;

            bool isCompanyDayOff = await _context.DayOffs
                .AnyAsync(d => d.Date == checkDate);

            if (availability != null)
            {
                return Ok(availability);
            }

            return Ok(new
            {
                TruckId = truckId,
                Date = date,
                IsAvailable = !(isWeekend || isCompanyDayOff),
                IsDayOff = isWeekend || isCompanyDayOff,
                Reason = isWeekend ? "Weekend" :
                         isCompanyDayOff ? "Company holiday" :
                         "Available"
            });
        }
        catch
        {
            return StatusCode(500, "Error checking truck availability");
        }
    }


    [HttpGet("Stats")]
    public async Task<IActionResult> GetTruckAvailabilityStats(
        [FromQuery] string date)
    {
        try
        {
            var targetDate = DateTime.ParseExact(date, "yyyy-MM-dd", null);

            var totalTrucks = await _context.Trucks.CountAsync();

            var available = await _context.TruckAvailabilities
                .CountAsync(a => a.Date == targetDate &&
                                 a.IsAvailable &&
                                 !a.IsDayOff);

            var unavailable = await _context.TruckAvailabilities
                .CountAsync(a => a.Date == targetDate &&
                                 !a.IsAvailable &&
                                 !a.IsDayOff);

            var dayOff = await _context.TruckAvailabilities
                .CountAsync(a => a.Date == targetDate &&
                                 a.IsDayOff);

            return Ok(new
            {
                date,
                totalTrucks,
                available,
                unavailable,
                dayOff
            });
        }
        catch
        {
            return StatusCode(500, "Error retrieving truck statistics");
        }
    }
}
