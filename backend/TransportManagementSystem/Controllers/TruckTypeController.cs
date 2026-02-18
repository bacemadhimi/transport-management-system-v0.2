using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TruckTypeController : ControllerBase
{
    private readonly ApplicationDbContext dbContext;
    private readonly IRepository<TruckType> truckTypeRepository;

    public TruckTypeController(
        ApplicationDbContext context,
        IRepository<TruckType> truckTypeRepository)
    {
        dbContext = context;
        this.truckTypeRepository = truckTypeRepository;
    }

   
    /// Get all active truck types
    [HttpGet]
    public async Task<IActionResult> GetAllTruckTypes()
    {
        try
        {
            var truckTypes = await dbContext.TruckTypes
                .Where(x => x.IsEnable == true)
                .OrderBy(x => x.Type)
                .ToListAsync();

            return Ok(truckTypes);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving truck types", error = ex.Message });
        }
    }
}
