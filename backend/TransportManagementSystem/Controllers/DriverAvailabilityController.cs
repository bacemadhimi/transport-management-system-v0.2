using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DriverAvailabilityController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DriverAvailabilityController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetDriverAvailabilities([FromQuery] AvailabilityFilterDto filter)
    {
        try
        {
            var driversQuery = _context.Drivers.AsQueryable();

            if (!string.IsNullOrEmpty(filter.Search))
            {
                driversQuery = driversQuery.Where(d =>
                    (d.Name != null && d.Name.Contains(filter.Search)) ||
                    (d.PermisNumber != null && d.PermisNumber.Contains(filter.Search)) ||
                    d.Phone.Contains(filter.Search) ||
                    (d.Status != null && d.Status.Contains(filter.Search))
                );
            }

            
            var totalCount = await driversQuery.CountAsync();

            if (filter.PageIndex.HasValue && filter.PageSize.HasValue)
            {
                driversQuery = driversQuery
                    .Skip(filter.PageIndex.Value * filter.PageSize.Value)
                    .Take(filter.PageSize.Value);
            }

            var driversList = await driversQuery
                .OrderBy(d => d.Name)
                .ToListAsync();

            var startDate = DateTime.ParseExact(filter.StartDate, "yyyy-MM-dd", null);
            var endDate = DateTime.ParseExact(filter.EndDate, "yyyy-MM-dd", null);

            var driverIds = driversList.Select(d => d.Id).ToList();

            var existingAvailabilities = await _context.DriverAvailabilities
                .Where(da => driverIds.Contains(da.DriverId) &&
                            da.Date >= startDate && da.Date <= endDate)
                .ToListAsync();

            var companyDayOffs = await _context.DayOffs
                .Where(d => d.Date >= startDate && d.Date <= endDate)
                .Select(d => d.Date)
                .Distinct()
                .ToListAsync();

            var result = new List<DriverAvailabilityDto>();

            foreach (var driver in driversList)
            {
                var dto = new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    Phone = driver.Phone,
                    Status = driver.Status,
                    Availability = new Dictionary<string, AvailabilityDayDto>()
                };

                for (var date = startDate; date <= endDate; date = date.AddDays(1))
                {
                    var dateOnly = date.ToString("yyyy-MM-dd");
                    var existing = existingAvailabilities.FirstOrDefault(a =>
                        a.DriverId == driver.Id && a.Date.Date == date.Date);

                    var isWeekend = date.DayOfWeek == DayOfWeek.Saturday ||
                                    date.DayOfWeek == DayOfWeek.Sunday;
                    var isCompanyDayOff = companyDayOffs.Contains(date.Date);
                    var isDayOff = isWeekend || isCompanyDayOff;

                    
                    bool isAvailable;

                    if (isDayOff)
                    {
                       
                        isAvailable = false;
                    }
                    else if (existing != null)
                    {
                        
                        isAvailable = existing.IsAvailable;
                    }
                    else
                    {
                      
                        isAvailable = true;
                    }

                    dto.Availability[date.ToString("yyyy-MM-dd")] = new AvailabilityDayDto
                    {
                        IsAvailable = isAvailable,
                        IsDayOff = isDayOff,
                        Reason = isWeekend ? "Weekend" :
                                 isCompanyDayOff ? "Jour férié" :
                                 existing?.Reason ?? ""
                    };
                }

                result.Add(dto);
            }

            return Ok(new
            {
                data = result,
                totalData = totalCount
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la récupération des disponibilités.",
                error = ex.Message
            });
        }
    }


    [HttpPost("{driverId}")]
    public async Task<IActionResult> UpdateDriverAvailability(int driverId, [FromBody] UpdateAvailabilityDto updateDto)
    {
        try
        {
          
            var driver = await _context.Drivers.FindAsync(driverId);
            if (driver == null)
            {
                return NotFound(new
                {
                    message = $"Le chauffeur avec l'ID {driverId} n'existe pas.",
                    status = 404
                });
            }

            var date = DateTime.ParseExact(updateDto.Date, "yyyy-MM-dd", null);

           
            var isWeekend = date.DayOfWeek == DayOfWeek.Sunday || date.DayOfWeek == DayOfWeek.Saturday;
            if (isWeekend)
            {
                return BadRequest(new
                {
                    message = "Impossible de modifier la disponibilité pour un weekend.",
                    status = 400
                });
            }

           
            var isCompanyDayOff = await _context.DayOffs
                .AnyAsync(cdo => cdo.Date == date);
            if (isCompanyDayOff)
            {
                return BadRequest(new
                {
                    message = "Impossible de modifier la disponibilité pour un jour férié.",
                    status = 400
                });
            }

           
            var existingAvailability = await _context.DriverAvailabilities
                .FirstOrDefaultAsync(da => da.DriverId == driverId && da.Date == date);

            if (existingAvailability != null)
            {
               
                existingAvailability.IsAvailable = updateDto.IsAvailable;
                existingAvailability.IsDayOff = updateDto.IsDayOff;
                existingAvailability.Reason = updateDto.Reason ?? "";
                existingAvailability.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                
                var newAvailability = new DriverAvailability
                {
                    DriverId = driverId,
                    Date = date,
                    IsAvailable = updateDto.IsAvailable,
                    IsDayOff = updateDto.IsDayOff,
                    Reason = updateDto.Reason ?? "",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _context.DriverAvailabilities.AddAsync(newAvailability);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Disponibilité mise à jour pour le {date:dd/MM/yyyy}",
                success = true,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la mise à jour de la disponibilité.",
                error = ex.Message,
                status = 500
            });
        }
    }

 
    [HttpGet("CompanyDayOffs")]
    public async Task<IActionResult> GetCompanyDayOffs()
    {
        try
        {
            var dayOffs = await _context.DayOffs
                .OrderBy(cdo => cdo.Date)
                .Select(cdo => new
                {
                    date = cdo.Date.ToString("yyyy-MM-dd"),
                    description = cdo.Description
                })
                .ToListAsync();

            return Ok(new
            {
                dayOffs,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la récupération des jours fériés.",
                error = ex.Message,
                status = 500
            });
        }
    }


    [HttpPost("Initialize/{driverId}")]
    public async Task<IActionResult> InitializeDriverAvailability(int driverId, [FromBody] List<string> dates)
    {
        try
        {
          
            var driver = await _context.Drivers.FindAsync(driverId);
            if (driver == null)
            {
                return NotFound(new
                {
                    message = $"Le chauffeur avec l'ID {driverId} n'existe pas.",
                    status = 404
                });
            }

            var dateList = dates.Select(d => DateTime.ParseExact(d, "yyyy-MM-dd", null)).ToList();

            
            var companyDayOffs = await _context.DayOffs
                .Where(cdo => dateList.Contains(cdo.Date))
                .Select(cdo => cdo.Date)
                .ToListAsync();

            
            var existingDates = await _context.DriverAvailabilities
                .Where(da => da.DriverId == driverId && dateList.Contains(da.Date))
                .Select(da => da.Date)
                .ToListAsync();

            
            var newDates = dateList.Where(d => !existingDates.Contains(d)).ToList();

            if (newDates.Any())
            {
                var availabilities = newDates.Select(date =>
                {
                    var isWeekend = date.DayOfWeek == DayOfWeek.Sunday || date.DayOfWeek == DayOfWeek.Saturday;
                    var isCompanyDayOff = companyDayOffs.Contains(date);

                    return new DriverAvailability
                    {
                        DriverId = driverId,
                        Date = date,
                        IsAvailable = !isWeekend && !isCompanyDayOff, // Disponible par défaut
                        IsDayOff = isWeekend || isCompanyDayOff,
                        Reason = isWeekend ? "Weekend" : isCompanyDayOff ? "Jour férié" : "",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }).ToList();

                await _context.DriverAvailabilities.AddRangeAsync(availabilities);
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = $"Disponibilité initialisée pour {newDates.Count} jours",
                initializedCount = newDates.Count,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de l'initialisation de la disponibilité.",
                error = ex.Message,
                status = 500
            });
        }
    }


    [HttpGet("Stats")]
    public async Task<IActionResult> GetAvailabilityStats([FromQuery] string date)
    {
        try
        {
            var targetDate = DateTime.ParseExact(date, "yyyy-MM-dd", null);

            var totalDrivers = await _context.Drivers.CountAsync();
            var availableDrivers = await _context.DriverAvailabilities
                .Where(da => da.Date == targetDate && da.IsAvailable && !da.IsDayOff)
                .CountAsync();

            var unavailableDrivers = await _context.DriverAvailabilities
                .Where(da => da.Date == targetDate && !da.IsAvailable && !da.IsDayOff)
                .CountAsync();

            var dayOffDrivers = await _context.DriverAvailabilities
                .Where(da => da.Date == targetDate && da.IsDayOff)
                .CountAsync();

            return Ok(new
            {
                date = targetDate.ToString("yyyy-MM-dd"),
                totalDrivers,
                availableDrivers,
                unavailableDrivers,
                dayOffDrivers,
                status = 200
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Une erreur est survenue lors de la récupération des statistiques.",
                error = ex.Message,
                status = 500
            });
        }
    }
    [HttpGet("AvailableDrivers")]
    public async Task<ActionResult<AvailableDriversResponseDto>> GetAvailableDrivers(
        [FromQuery] string date,
        [FromQuery] int? excludeTripId = null,
        [FromQuery] int? zoneId = null)
    {
        try
        {
            if (!DateTime.TryParse(date, out DateTime checkDate))
                return BadRequest("Invalid date format. Use YYYY-MM-DD.");

            bool isWeekend = checkDate.DayOfWeek == DayOfWeek.Saturday || checkDate.DayOfWeek == DayOfWeek.Sunday;
            bool isCompanyDayOff = await IsCompanyDayOff(checkDate);

            // Fetch all drivers
            var allDrivers = await _context.Drivers
                .Include(d => d.Zone)
                .Where(d => d.IsEnable && (!zoneId.HasValue || d.ZoneId == zoneId.Value))
                .ToListAsync();

            // Get trips on the date, excluding the current trip
            var tripsOnDate = await _context.Trips
                .Where(t => t.EstimatedStartDate == checkDate &&
                            t.TripStatus != TripStatus.Cancelled &&
                            (excludeTripId == null || t.Id != excludeTripId))
                .Select(t => t.DriverId)
                .ToListAsync();

            // Get driver of the trip being edited
            int? excludedDriverId = null;
            if (excludeTripId.HasValue)
            {
                excludedDriverId = await _context.Trips
                    .Where(t => t.Id == excludeTripId.Value)
                    .Select(t => (int?)t.DriverId)
                    .FirstOrDefaultAsync();
            }

            // Get availability records
            var availabilityRecords = await _context.DriverAvailabilities
                .Where(da => da.Date.Date == checkDate.Date)
                .ToListAsync();

            var availableDrivers = new List<DriverAvailabilityDto>();
            var unavailableDrivers = new List<DriverAvailabilityDto>();

            foreach (var driver in allDrivers)
            {
                var record = availabilityRecords.FirstOrDefault(r => r.DriverId == driver.Id);
                bool hasOtherTrip = tripsOnDate.Contains(driver.Id);
                bool isExcludedDriver = excludedDriverId.HasValue && driver.Id == excludedDriverId.Value;

                bool isAvailable = true;
                string reason = "Available";

                // Check availability record
                if (record != null)
                {
                    if (record.IsDayOff)
                    {
                        isAvailable = false;
                        reason = "Day off";
                    }
                    else if (!record.IsAvailable)
                    {
                        isAvailable = false;
                        reason = record.Reason ?? "Unavailable";
                    }
                }

                // Check if assigned to other trip (exclude current trip driver)
                if (hasOtherTrip && !isExcludedDriver)
                {
                    isAvailable = false;
                    reason = "Already assigned to another trip";
                }

                // Check weekend/company holiday
                if ((isWeekend || isCompanyDayOff) && !isExcludedDriver)
                {
                    bool overrideAvailable = record != null && record.IsAvailable &&
                                             (record.Reason?.Contains("override") == true ||
                                              record.Reason?.Contains("emergency") == true);

                    if (!overrideAvailable)
                    {
                        isAvailable = false;
                        reason = isWeekend ? "Weekend" : "Company holiday";
                    }
                    else
                    {
                        reason = $"{(isWeekend ? "Weekend" : "Company holiday")} - Available by override: {record.Reason}";
                        isAvailable = true;
                    }
                }

                // Ensure excluded driver is always available
                if (isExcludedDriver)
                {
                    isAvailable = true;
                    reason = "Assigned to this trip";
                }

                var dto = new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = isAvailable,
                    Reason = reason,
                    ZoneName = driver.Zone?.Name,
                    PermisNumber = driver.PermisNumber
                };

                if (isAvailable)
                    availableDrivers.Add(dto);
                else
                    unavailableDrivers.Add(dto);
            }

            // Sort
            availableDrivers = availableDrivers.OrderBy(d => d.DriverName).ToList();
            unavailableDrivers = unavailableDrivers.OrderBy(d => d.DriverName).ToList();

            return Ok(new AvailableDriversResponseDto
            {
                AvailableDrivers = availableDrivers,
                UnavailableDrivers = unavailableDrivers,
                IsWeekend = isWeekend,
                IsCompanyDayOff = isCompanyDayOff,
                Date = checkDate
            });
        }
        catch (Exception)
        {
            return StatusCode(500, "An error occurred while checking driver availability.");
        }
    }


    [HttpGet("CheckDriverAvailability/{driverId}")]
    public async Task<ActionResult<DriverAvailabilityDto>> CheckDriverAvailability(
        int driverId,
        [FromQuery] string date,
        [FromQuery] int? excludeTripId = null)
    {
        try
        {
            if (!DateTime.TryParse(date, out DateTime checkDate))
            {
                return BadRequest("Invalid date format. Use YYYY-MM-DD.");
            }

            var driver = await _context.Drivers
                .Where(d => d.Id == driverId && d.IsEnable)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.PermisNumber
                })
                .FirstOrDefaultAsync();

            if (driver == null)
            {
                return NotFound($"Chauffeur avec ID {driverId} non trouvé.");
            }

           
            var availabilityRecord = await _context.DriverAvailabilities
                .Where(da => da.DriverId == driverId && da.Date.Date == checkDate.Date)
                .Select(da => new
                {
                    da.IsAvailable,
                    da.IsDayOff,
                    da.Reason,
                    da.CreatedAt,
                    da.UpdatedAt
                })
                .FirstOrDefaultAsync();

           
            if (availabilityRecord != null)
            {
                if (availabilityRecord.IsDayOff)
                {
                    return Ok(new DriverAvailabilityDto
                    {
                        DriverId = driver.Id,
                        DriverName = driver.Name,
                        IsAvailable = false,
                        IsDayOff = true,
                        Reason = availabilityRecord.Reason ?? "Day off scheduled",
                        
                    });
                }
                else if (!availabilityRecord.IsAvailable)
                {
                    return Ok(new DriverAvailabilityDto
                    {
                        DriverId = driver.Id,
                        DriverName = driver.Name,
                        IsAvailable = false,
                        IsDayOff = false,
                        Reason = availabilityRecord.Reason ?? "Manually marked as unavailable",
                        
                    });
                }
               
            }

            bool isWeekend = checkDate.DayOfWeek == DayOfWeek.Saturday || checkDate.DayOfWeek == DayOfWeek.Sunday;
            bool isCompanyDayOff = await IsCompanyDayOff(checkDate);

            var conflictingTrip = await _context.Trips
                .Where(t => t.DriverId == driverId &&
                           t.EstimatedStartDate == checkDate.Date &&
                           t.TripStatus != TripStatus.Cancelled &&
                           (excludeTripId == null || t.Id != excludeTripId))
                .Select(t => new
                {
                    t.Id,
                    t.BookingId,
                    t.EstimatedStartDate,
                    t.EstimatedEndDate,
                    t.TripStatus
                })
                .FirstOrDefaultAsync();

           
            if (isWeekend && availabilityRecord == null)
            {
                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = false,
                    IsDayOff = true,
                    Reason = "Weekend - No scheduled work",
                    
                });
            }

      
            if (isCompanyDayOff && availabilityRecord == null)
            {
                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = false,
                    IsDayOff = true,
                    Reason = "Company holiday - No scheduled work",
                    
                });
            }

           
            if ((isWeekend || isCompanyDayOff) && availabilityRecord != null && availabilityRecord.IsAvailable)
            {
               
                if (conflictingTrip != null)
                {
                    return Ok(new DriverAvailabilityDto
                    {
                        DriverId = driver.Id,
                        DriverName = driver.Name,
                        IsAvailable = false,
                        IsDayOff = false,
                        Reason = $"Already assigned to trip #{conflictingTrip.Id}",
                        
                      
                    });
                }

                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = true,
                    IsDayOff = false,
                    Reason = availabilityRecord.Reason ?? $"Available by override ({(isWeekend ? "Weekend" : "Holiday")})",
                    
                });
            }

           
            if (conflictingTrip != null)
            {
                return Ok(new DriverAvailabilityDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name,
                    IsAvailable = false,
                    IsDayOff = false,
                    Reason = $"Already assigned to trip #{conflictingTrip.Id}",
                   
                });
            }

          
            return Ok(new DriverAvailabilityDto
            {
                DriverId = driver.Id,
                DriverName = driver.Name,
                IsAvailable = true,
                IsDayOff = false,
                Reason = availabilityRecord?.Reason ?? "Available for assignment",
                
            });
        }
        catch (Exception ex)
        {
           
            return StatusCode(500, "Une erreur est survenue lors de la vérification de disponibilité.");
        }
    }

    private async Task<bool> IsCompanyDayOff(DateTime date)
    {
      
        var isDayOff = await _context.DayOffs
            .AnyAsync(d => d.Date.Date == date.Date);

        return isDayOff;
    }
}