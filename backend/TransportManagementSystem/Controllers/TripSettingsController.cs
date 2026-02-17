using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TripSettingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public TripSettingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _context.TripSettings.FirstOrDefaultAsync();

        if (settings == null)
        {
            settings = new TripSetting();
            _context.TripSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return Ok(settings);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] TripSetting model)
    {
        var settings = await _context.TripSettings.FirstOrDefaultAsync();

        if (settings == null)
            return NotFound();

        settings.AllowEditTrips = model.AllowEditTrips;
        settings.AllowDeleteTrips = model.AllowDeleteTrips;
        settings.EditTimeLimit = model.EditTimeLimit;
        settings.MaxTripsPerDay = model.MaxTripsPerDay;
        settings.TripOrder = model.TripOrder;
        settings.RequireDeleteConfirmation = model.RequireDeleteConfirmation;
        settings.NotifyOnTripEdit = model.NotifyOnTripEdit;
        settings.NotifyOnTripDelete = model.NotifyOnTripDelete;
        settings.LinkDriverToTruck = model.LinkDriverToTruck;

        await _context.SaveChangesAsync();

        return Ok(settings);
    }
}
