using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
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

    [HttpGet("Pagination and Search")]
    public async Task<IActionResult> GetEnabledDriverList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Driver>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await dbContext.Drivers
                .Where(x => x.IsEnable == true)
                .ToListAsync();
        }
        else
        {
            pagedData.Data = await dbContext.Drivers
                .Where(x => x.IsEnable == true &&
                   (
                       (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                       (x.PermisNumber != null && x.PermisNumber.Contains(searchOption.Search)) ||
                       x.Phone.Contains(searchOption.Search) ||
                       (x.Status != null && x.Status.Contains(searchOption.Search)) ||
                       x.IdCamion.ToString().Contains(searchOption.Search)
                   )
                )
                .ToListAsync();
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


    //Get
    [HttpGet("ListOfDrivers")]
    public async Task<ActionResult<IEnumerable<Driver>>> GetDriver()
    {
        var drivers = await dbContext.Drivers
            .Include(d => d.Zone)   
            .ToListAsync();

        return Ok(drivers);
    }

    //Get By Id
    [HttpGet("{id}")]
    public async Task<ActionResult<Driver>> GetDriverById(int id)
    {
        var drivers = await dbContext.Drivers.FindAsync(id);

        if (drivers == null)
            return NotFound(new
            {
                message = $"Driver with ID {id} was not found in the database.",
                Status = 404

            });
        return drivers;
    }

    //Create
    [HttpPost]
    public async Task<ActionResult<Driver>> CreateDriver(Driver driver)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var emailExists = await dbContext.Drivers
            .AnyAsync(d => d.Email == driver.Email);

        if (emailExists)
        {
            return BadRequest(new
            {
                message = $"L'email '{driver.Email}' est déjà utilisé par un autre chauffeur.",
                Status = 400
            });
        }

        dbContext.Drivers.Add(driver);
        await dbContext.SaveChangesAsync();

        if (driver.Id == 0)
            return BadRequest("Driver ID was not generated. Something went wrong.");

        await CreateUserForDriver(driver);

        return CreatedAtAction(nameof(GetDriverById), new { id = driver.Id }, driver);
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDriver(int id, Driver driver)
    {
        var existingDriver = await dbContext.Drivers.FindAsync(id);
        // ID does NOT exist → show message
        if (existingDriver == null)
        {
            return NotFound(new
            {
                message = $"Driver with ID {id} was not found.",
                Status = 404
            });
        }

        // ID exists → update the driver
        existingDriver.Name = driver.Name;
        existingDriver.Email = driver.Email;
        existingDriver.PermisNumber = driver.PermisNumber;
        existingDriver.Phone = driver.Phone;
        existingDriver.Status = driver.Status;
        existingDriver.IdCamion = driver.IdCamion;
        existingDriver.phoneCountry = driver.phoneCountry;
        existingDriver.IsEnable = driver.IsEnable;
        existingDriver.ZoneId = driver.ZoneId;
        existingDriver.ImageBase64 = driver.ImageBase64;
        existingDriver.CityId = driver.CityId;
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = $"Driver with ID {id} has been updated successfully.",
            Status = 200,
            Data = existingDriver
        });
    }

    //Delete
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDriver(int id)
    {
        // Find the driver by ID
        var existingDriver = await dbContext.Drivers.FindAsync(id);

        if (existingDriver == null)
        {
            return NotFound(new
            {
                message = $"Driver with ID {id} was not found.",
                Status = 404
            });
        }

        // Remove the driver
        dbContext.Drivers.Remove(existingDriver);
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = $"Driver with ID {id} has been deleted successfully.",
            Status = 200
        });
    }

    [HttpPut("DriverStatus")]
    public async Task<IActionResult> ActivateDriver([FromQuery] int driverId)
    {
        var driver = await dbContext.Drivers.FirstOrDefaultAsync(x => x.Id == driverId);

        if (driver == null)
            return NotFound();

        driver.IsEnable = true;
        driver.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return Ok(driver);
    }

    // Search disabled drivers
    [HttpGet("PaginationDisableDriver")]
    public async Task<IActionResult> GetDisableDriver([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Driver>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await dbContext.Drivers
                .Where(x => x.IsEnable == false)
                .ToListAsync();
        }
        else
        {
            pagedData.Data = await dbContext.Drivers
                .Where(x => x.IsEnable == false &&
                   (
                       (x.Name != null && x.Name.Contains(searchOption.Search)) || (x.Email != null && x.Email.Contains(searchOption.Search)) ||
                       (x.PermisNumber != null && x.PermisNumber.Contains(searchOption.Search)) ||
                       x.Phone.Contains(searchOption.Search) ||
                       (x.Status != null && x.Status.Contains(searchOption.Search)) ||
                       x.IdCamion.ToString().Contains(searchOption.Search)
                   )
                )
                .ToListAsync();
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

    //Désactiver Driver
    [HttpPut("DisableDriverFromList/{id}")]
    public async Task<IActionResult> DisableDriver(int id)
    {
        var driver = await dbContext.Drivers.FirstOrDefaultAsync(x => x.Id == id);

        if (driver == null)
            return NotFound();

        driver.IsEnable = false;
        driver.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return Ok();
    }


    private async Task CreateUserForDriver(Driver driver)
    {
        var existingUser = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == driver.Email);

        if (existingUser != null)
        {
            // ✅ FIX PERMANENT: Link existing user to this driver
            driver.user_id = existingUser.Id;
            await dbContext.SaveChangesAsync();
            return;
        }

        var user = new User
        {
            Email = driver.Email,
            Name = driver.Name,
            Phone = driver.Phone,
            phoneCountry = driver.phoneCountry,
            Password = passwordHelper.HashPassword("12345"),
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        // ✅ FIX PERMANENT: Link the newly created user to this driver
        driver.user_id = user.Id;
        await dbContext.SaveChangesAsync();

        await AssignUserToDriverGroup(user.Id);
    }
    private async Task AssignUserToDriverGroup(int userId)
    {

        var driverGroup = await dbContext.UserGroups
            .FirstOrDefaultAsync(g => g.Name == "Driver");

        if (driverGroup == null)
            return;


        dbContext.UserGroup2Users.Add(new UserGroup2User
        {
            UserId = userId,
            UserGroupId = driverGroup.Id
        });

        await dbContext.SaveChangesAsync();
    }


[HttpGet("zone/{zoneId}")]
    public async Task<ActionResult<IEnumerable<Driver>>> GetDriversByZone(int zoneId)
    {
        var drivers = await dbContext.Drivers
            .Where(d => d.IsEnable && d.ZoneId == zoneId)
            .Select(d => new Driver
            {
                Id = d.Id,
                Name = d.Name,
                PermisNumber = d.PermisNumber,
                Phone = d.Phone,
                ZoneId = d.ZoneId
            })
            .ToListAsync();

        return Ok(drivers);
    }

}