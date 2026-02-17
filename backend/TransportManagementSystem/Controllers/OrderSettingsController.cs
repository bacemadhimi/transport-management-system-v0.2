using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrderSettingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public OrderSettingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
      
        var settings = await _context.OrderSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
 
            settings = new OrderSetting();
            _context.OrderSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return Ok(settings);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] OrderSetting model)
    {
        var settings = await _context.OrderSettings.FirstOrDefaultAsync();
        if (settings == null)
            return NotFound();

        settings.AllowEditOrder = model.AllowEditOrder;
        settings.AllowEditDeliveryDate = model.AllowEditDeliveryDate;
        settings.AllowLoadLateOrders = model.AllowLoadLateOrders;
        settings.AcceptOrdersWithoutAddress = model.AcceptOrdersWithoutAddress;
        settings.LoadingUnit = model.LoadingUnit; 
        settings.PlanningHorizon = model.PlanningHorizon;

        await _context.SaveChangesAsync();

        return Ok(settings);
    }
}
