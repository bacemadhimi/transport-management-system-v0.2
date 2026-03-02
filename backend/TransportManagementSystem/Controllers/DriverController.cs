using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DriverController : ControllerBase
{
    private readonly ApplicationDbContext dbContext;
    private readonly PasswordHelper passwordHelper;

    public DriverController(ApplicationDbContext context)
    {
        dbContext = context;
        this.passwordHelper = new PasswordHelper();
    }

    //Get all drivers
    [HttpGet("ListOfDrivers")]
    public async Task<ActionResult<IEnumerable<Driver>>> GetDriver()
    {
        var drivers = await dbContext.Employees
            .OfType<Driver>()
            .ToListAsync();

        return Ok(drivers);
    }

    //Get By Id
    [HttpGet("{id}")]
    public async Task<ActionResult<Driver>> GetDriverById(int id)
    {
        var driver = await dbContext.Employees
            .OfType<Driver>()
            .FirstOrDefaultAsync(d => d.Id == id);

        if (driver == null)
            return NotFound(new
            {
                message = $"Driver with ID {id} was not found in the database.",
                Status = 404
            });

        return Ok(driver);
    }

    [HttpPut("DriverStatus")]
    public async Task<IActionResult> ActivateDriver([FromQuery] int driverId)
    {
        var driver = await dbContext.Employees
            .OfType<Driver>()
            .FirstOrDefaultAsync(x => x.Id == driverId);

        if (driver == null)
            return NotFound(new
            {
                message = $"Driver with ID {driverId} was not found.",
                Status = 404
            });

        driver.IsEnable = true;
        driver.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = $"Driver with ID {driverId} has been activated successfully.",
            Status = 200,
            Data = driver
        });
    }
}