using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class OvertimeSettingController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public OvertimeSettingController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetOvertimeSettings(
        [FromQuery] SearchOptions searchOption,
        [FromQuery] int? driverId = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _context.OvertimeSettings
            .Include(o => o.Driver)
            .AsQueryable();

       
        if (driverId.HasValue)
            query = query.Where(o => o.DriverId == driverId.Value);

        if (isActive.HasValue)
            query = query.Where(o => o.IsActive == isActive.Value);

        
        if (!string.IsNullOrEmpty(searchOption.Search))
        {
            query = query.Where(o =>
                o.Driver.Name.Contains(searchOption.Search) ||
                (o.Notes != null && o.Notes.Contains(searchOption.Search)));
        }

        var totalData = await query.CountAsync();

       
        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        var data = await query.Select(o => new OvertimeSettingDto
        {
            Id = o.Id,
            DriverId = o.DriverId,
            DriverName = o.Driver.Name,
            IsActive = o.IsActive,
            MaxDailyHours = o.MaxDailyHours,
            MaxWeeklyHours = o.MaxWeeklyHours,
            OvertimeRatePerHour = o.OvertimeRatePerHour,
            AllowWeekendOvertime = o.AllowWeekendOvertime,
            AllowHolidayOvertime = o.AllowHolidayOvertime,
            WeekendRateMultiplier = o.WeekendRateMultiplier,
            HolidayRateMultiplier = o.HolidayRateMultiplier,
            Notes = o.Notes
        }).ToListAsync();

        var pagedData = new PagedData<OvertimeSettingDto>
        {
            Data = data,
            TotalData = totalData
        };

        return Ok(pagedData);
    }

    
    [HttpGet("{id}")]
    public async Task<ActionResult<OvertimeSetting>> GetOvertimeSetting(int id)
    {
        var overtimeSetting = await _context.OvertimeSettings
            .Include(o => o.Driver)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (overtimeSetting == null)
            return NotFound(new { message = $"Overtime setting with ID {id} not found.", Status = 404 });

        return overtimeSetting;
    }

    
    [HttpGet("driver/{driverId}")]
    public async Task<ActionResult<OvertimeSetting>> GetOvertimeSettingByDriver(int driverId)
    {
        var overtimeSetting = await _context.OvertimeSettings
            .Include(o => o.Driver)
            .FirstOrDefaultAsync(o => o.DriverId == driverId);

        if (overtimeSetting == null)
            return NotFound(new { message = $"Overtime setting for driver ID {driverId} not found.", Status = 404 });

        return overtimeSetting;
    }

   
    [HttpPost]
    public async Task<ActionResult<OvertimeSetting>> CreateOvertimeSetting(CreateOvertimeSettingDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        
        var driver = await _context.Drivers.FindAsync(dto.DriverId);
        if (driver == null)
            return BadRequest(new { message = "Driver not found.", Status = 400 });

        
        var existing = await _context.OvertimeSettings
            .FirstOrDefaultAsync(o => o.DriverId == dto.DriverId);

        if (existing != null)
            return BadRequest(new { message = "Overtime setting already exists for this driver.", Status = 400 });

        var overtimeSetting = new OvertimeSetting
        {
            DriverId = dto.DriverId,
            IsActive = dto.IsActive,
            MaxDailyHours = dto.MaxDailyHours,
            MaxWeeklyHours = dto.MaxWeeklyHours,
            OvertimeRatePerHour = dto.OvertimeRatePerHour,
            AllowWeekendOvertime = dto.AllowWeekendOvertime,
            AllowHolidayOvertime = dto.AllowHolidayOvertime,
            WeekendRateMultiplier = dto.WeekendRateMultiplier,
            HolidayRateMultiplier = dto.HolidayRateMultiplier,
            Notes = dto.Notes
        };

        _context.OvertimeSettings.Add(overtimeSetting);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOvertimeSetting), new { id = overtimeSetting.Id }, overtimeSetting);
    }

   
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOvertimeSetting(int id, CreateOvertimeSettingDto dto)
    {
        var overtimeSetting = await _context.OvertimeSettings.FindAsync(id);
        if (overtimeSetting == null)
            return NotFound(new { message = $"Overtime setting with ID {id} not found.", Status = 404 });

        overtimeSetting.IsActive = dto.IsActive;
        overtimeSetting.MaxDailyHours = dto.MaxDailyHours;
        overtimeSetting.MaxWeeklyHours = dto.MaxWeeklyHours;
        overtimeSetting.OvertimeRatePerHour = dto.OvertimeRatePerHour;
        overtimeSetting.AllowWeekendOvertime = dto.AllowWeekendOvertime;
        overtimeSetting.AllowHolidayOvertime = dto.AllowHolidayOvertime;
        overtimeSetting.WeekendRateMultiplier = dto.WeekendRateMultiplier;
        overtimeSetting.HolidayRateMultiplier = dto.HolidayRateMultiplier;
        overtimeSetting.Notes = dto.Notes;
        overtimeSetting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Overtime setting with ID {id} updated successfully.", Status = 200, Data = overtimeSetting });
    }

   
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOvertimeSetting(int id)
    {
        var overtimeSetting = await _context.OvertimeSettings.FindAsync(id);
        if (overtimeSetting == null)
            return NotFound(new { message = $"Overtime setting with ID {id} not found.", Status = 404 });

        _context.OvertimeSettings.Remove(overtimeSetting);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Overtime setting with ID {id} deleted successfully.", Status = 200 });
    }

    
    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleOvertimeStatus(int id)
    {
        var overtimeSetting = await _context.OvertimeSettings.FindAsync(id);
        if (overtimeSetting == null)
            return NotFound(new { message = $"Overtime setting with ID {id} not found.", Status = 404 });

        overtimeSetting.IsActive = !overtimeSetting.IsActive;
        overtimeSetting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var status = overtimeSetting.IsActive ? "activé" : "désactivé";
        return Ok(new
        {
            message = $"Overtime setting {status} avec succès.",
            Status = 200,
            IsActive = overtimeSetting.IsActive
        });
    }
}