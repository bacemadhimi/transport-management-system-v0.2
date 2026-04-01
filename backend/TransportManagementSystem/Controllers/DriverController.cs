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
public class DriversController : ControllerBase
{
    private readonly ApplicationDbContext context;

    public DriversController(ApplicationDbContext context)
    {
        this.context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetDrivers([FromQuery] SearchOptions searchOption)
    {
        var query = context.Employees
            .OfType<Driver>()
            .Include(d => d.TypeTruck)
            .Include(d => d.DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .Where(d => d.EmployeeCategory == "DRIVER")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            var search = searchOption.Search.Trim();
            query = query.Where(x =>
                (!string.IsNullOrEmpty(x.Name) && x.Name.Contains(search)) ||
                (!string.IsNullOrEmpty(x.IdNumber) && x.IdNumber.Contains(search)) ||
                (!string.IsNullOrEmpty(x.PhoneNumber) && x.PhoneNumber.Contains(search)) ||
                (!string.IsNullOrEmpty(x.Email) && x.Email.Contains(search))
            );
        }

        var totalCount = await query.CountAsync();

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        var drivers = await query.ToListAsync();

        var driverDtos = drivers.Select(d => new DriverDto
        {
            Id = d.Id,
            IdNumber = d.IdNumber,
            Name = d.Name,
            Email = d.Email,
            PhoneNumber = d.PhoneNumber,
            PhoneCountry = d.PhoneCountry,
            DrivingLicense = d.DrivingLicense,
            TypeTruckId = d.TypeTruckId,
            TypeTruck = d.TypeTruck != null ? new TypeTruckDto
            {
                Id = d.TypeTruck.Id,
                Type = d.TypeTruck.Type,
                Capacity = d.TypeTruck.Capacity,
                
            } : null,
            DrivingLicenseAttachment = d.DrivingLicenseAttachment,
            AttachmentFileName = d.AttachmentFileName,
            AttachmentFileType = d.AttachmentFileType,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
            IsEnable = d.IsEnable,
            EmployeeCategory = d.EmployeeCategory,
            IsInternal = d.IsInternal,
            Status = d.Status,
            IdCamion = d.IdCamion,
            ImageBase64 = d.ImageBase64,
            GeographicalEntities = d.DriverGeographicalEntities?
                .Where(dg => dg.GeographicalEntity != null && dg.GeographicalEntity.IsActive)
                .Select(dg => new DriverGeographicalEntityDto
                {
                    GeographicalEntityId = dg.GeographicalEntityId,
                    GeographicalEntityName = dg.GeographicalEntity.Name,
                    LevelName = dg.GeographicalEntity.Level?.Name,
                    LevelNumber = dg.GeographicalEntity.Level?.LevelNumber ?? 0,
                    Latitude = dg.GeographicalEntity.Latitude,
                    Longitude = dg.GeographicalEntity.Longitude
                }).ToList() ?? new List<DriverGeographicalEntityDto>()
        }).ToList();

        var pagedData = new PagedData<DriverDto>
        {
            Data = driverDtos,
            TotalData = totalCount
        };

        return Ok(pagedData);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDriverById(int id)
    {
        var driver = await context.Employees
            .OfType<Driver>()
            .Include(d => d.TypeTruck)
            .Include(d => d.DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .FirstOrDefaultAsync(d => d.Id == id && d.EmployeeCategory == "DRIVER");

        if (driver == null)
            return NotFound(new ApiResponse(false, $"Chauffeur {id} non trouvé"));

        var driverDto = new DriverDto
        {
            Id = driver.Id,
            IdNumber = driver.IdNumber,
            Name = driver.Name,
            Email = driver.Email,
            PhoneNumber = driver.PhoneNumber,
            PhoneCountry = driver.PhoneCountry,
            DrivingLicense = driver.DrivingLicense,
            TypeTruckId = driver.TypeTruckId,
            TypeTruck = driver.TypeTruck != null ? new TypeTruckDto
            {
                Id = driver.TypeTruck.Id,
                Type = driver.TypeTruck.Type,
                Capacity = driver.TypeTruck.Capacity,
                
            } : null,
            DrivingLicenseAttachment = driver.DrivingLicenseAttachment,
            AttachmentFileName = driver.AttachmentFileName,
            AttachmentFileType = driver.AttachmentFileType,
            CreatedAt = driver.CreatedAt,
            UpdatedAt = driver.UpdatedAt,
            IsEnable = driver.IsEnable,
            EmployeeCategory = driver.EmployeeCategory,
            IsInternal = driver.IsInternal,
            Status = driver.Status,
            IdCamion = driver.IdCamion,
            ImageBase64 = driver.ImageBase64,
            GeographicalEntities = driver.DriverGeographicalEntities?
                .Where(dg => dg.GeographicalEntity != null && dg.GeographicalEntity.IsActive)
                .Select(dg => new DriverGeographicalEntityDto
                {
                    GeographicalEntityId = dg.GeographicalEntityId,
                    GeographicalEntityName = dg.GeographicalEntity.Name,
                    LevelName = dg.GeographicalEntity.Level?.Name,
                    LevelNumber = dg.GeographicalEntity.Level?.LevelNumber ?? 0,
                    Latitude = dg.GeographicalEntity.Latitude,
                    Longitude = dg.GeographicalEntity.Longitude
                }).ToList() ?? new List<DriverGeographicalEntityDto>()
        };

        return Ok(new ApiResponse(true, "Chauffeur récupéré avec succès", driverDto));
    }

    [HttpPost]
    public async Task<IActionResult> AddDriver([FromBody] DriverDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var existingDriver = await context.Employees
            .OfType<Driver>()
            .FirstOrDefaultAsync(x => x.IdNumber == model.IdNumber || x.Email == model.Email);

        if (existingDriver != null)
            return BadRequest(new ApiResponse(false, "Un chauffeur avec ce numéro d'identité ou cet email existe déjà"));

        // Validate Geographical Entities if provided
        if (model.GeographicalEntities != null && model.GeographicalEntities.Any())
        {
            var entityIds = model.GeographicalEntities.Select(g => g.GeographicalEntityId).ToList();
            var validEntities = await context.GeographicalEntities
                .Where(g => entityIds.Contains(g.Id) && g.IsActive)
                .Select(g => g.Id)
                .ToListAsync();

            var invalidIds = entityIds.Except(validEntities).ToList();
            if (invalidIds.Any())
                return BadRequest(new ApiResponse(false,
                    $"Les entités géographiques avec IDs {string.Join(", ", invalidIds)} sont invalides ou inactives"));
        }

        var driver = new Driver
        {
            IdNumber = model.IdNumber,
            Name = model.Name,
            Email = model.Email,
            PhoneNumber = model.PhoneNumber,
            PhoneCountry = model.PhoneCountry ?? "tn",
            DrivingLicense = model.DrivingLicense,
            TypeTruckId = model.TypeTruckId,
            IsEnable = true,
            EmployeeCategory = "DRIVER",
            IsInternal = model.IsInternal,
            Status = model.Status ?? "Disponible",
            IdCamion = model.IdCamion ?? 0,
            ImageBase64 = model.ImageBase64,
            DriverGeographicalEntities = new List<DriverGeographicalEntity>()
        };

        // Add geographical entities
        if (model.GeographicalEntities != null && model.GeographicalEntities.Any())
        {
            foreach (var geoDto in model.GeographicalEntities)
            {
                driver.DriverGeographicalEntities.Add(new DriverGeographicalEntity
                {
                    GeographicalEntityId = geoDto.GeographicalEntityId
                });
            }
        }

        await context.Employees.AddAsync(driver);
        await context.SaveChangesAsync();

        // Load the created driver with relationships
        var createdDriver = await context.Employees
            .OfType<Driver>()
            .Include(d => d.TypeTruck)
            .Include(d => d.DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .FirstOrDefaultAsync(d => d.Id == driver.Id);

        var driverDto = new DriverDto
        {
            Id = createdDriver.Id,
            IdNumber = createdDriver.IdNumber,
            Name = createdDriver.Name,
            Email = createdDriver.Email,
            PhoneNumber = createdDriver.PhoneNumber,
            PhoneCountry = createdDriver.PhoneCountry,
            DrivingLicense = createdDriver.DrivingLicense,
            TypeTruckId = createdDriver.TypeTruckId,
            TypeTruck = createdDriver.TypeTruck != null ? new TypeTruckDto
            {
                Id = createdDriver.TypeTruck.Id,
                Type = createdDriver.TypeTruck.Type,
                Capacity = createdDriver.TypeTruck.Capacity,
               
            } : null,
            IsEnable = createdDriver.IsEnable,
            EmployeeCategory = createdDriver.EmployeeCategory,
            IsInternal = createdDriver.IsInternal,
            Status = createdDriver.Status,
            IdCamion = createdDriver.IdCamion,
            ImageBase64 = createdDriver.ImageBase64,
            GeographicalEntities = createdDriver.DriverGeographicalEntities?
                .Where(dg => dg.GeographicalEntity != null && dg.GeographicalEntity.IsActive)
                .Select(dg => new DriverGeographicalEntityDto
                {
                    GeographicalEntityId = dg.GeographicalEntityId,
                    GeographicalEntityName = dg.GeographicalEntity.Name,
                    LevelName = dg.GeographicalEntity.Level?.Name,
                    LevelNumber = dg.GeographicalEntity.Level?.LevelNumber ?? 0,
                    Latitude = dg.GeographicalEntity.Latitude,
                    Longitude = dg.GeographicalEntity.Longitude
                }).ToList() ?? new List<DriverGeographicalEntityDto>()
        };

        return CreatedAtAction(nameof(GetDriverById), new { id = driver.Id },
            new ApiResponse(true, "Chauffeur créé avec succès", driverDto));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDriver(int id, [FromBody] DriverDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var driver = await context.Employees
            .OfType<Driver>()
            .Include(d => d.DriverGeographicalEntities) // Make sure to include this
            .FirstOrDefaultAsync(d => d.Id == id && d.EmployeeCategory == "DRIVER");

        if (driver == null)
            return NotFound(new ApiResponse(false, $"Chauffeur {id} non trouvé"));

        var existingDriver = await context.Employees
            .OfType<Driver>()
            .FirstOrDefaultAsync(x => (x.IdNumber == model.IdNumber || x.Email == model.Email) && x.Id != id);

        if (existingDriver != null)
            return BadRequest(new ApiResponse(false, "Un chauffeur avec ce numéro d'identité ou cet email existe déjà"));

        // Validate Geographical Entities if provided
        if (model.GeographicalEntities != null && model.GeographicalEntities.Any())
        {
            var entityIds = model.GeographicalEntities.Select(g => g.GeographicalEntityId).ToList();
            var validEntities = await context.GeographicalEntities
                .Where(g => entityIds.Contains(g.Id) && g.IsActive)
                .Select(g => g.Id)
                .ToListAsync();

            var invalidIds = entityIds.Except(validEntities).ToList();
            if (invalidIds.Any())
                return BadRequest(new ApiResponse(false,
                    $"Les entités géographiques avec IDs {string.Join(", ", invalidIds)} sont invalides ou inactives"));
        }

        // Update driver properties
        driver.IdNumber = model.IdNumber;
        driver.Name = model.Name;
        driver.Email = model.Email;
        driver.PhoneNumber = model.PhoneNumber;
        driver.PhoneCountry = model.PhoneCountry ?? "tn";
        driver.DrivingLicense = model.DrivingLicense;
        driver.TypeTruckId = model.TypeTruckId;
        driver.IsInternal = model.IsInternal;
        driver.Status = model.Status;
        driver.IdCamion = model.IdCamion ?? 0;
        driver.ImageBase64 = model.ImageBase64;
        driver.UpdatedAt = DateTime.UtcNow;

        // Update geographical entities
        if (model.GeographicalEntities != null)
        {
            // Remove old associations
            context.DriverGeographicalEntities.RemoveRange(driver.DriverGeographicalEntities);

            // Add new associations
            driver.DriverGeographicalEntities = model.GeographicalEntities.Select(geoDto => new DriverGeographicalEntity
            {
                DriverId = driver.Id,
                GeographicalEntityId = geoDto.GeographicalEntityId
            }).ToList();
        }

        context.Employees.Update(driver);
        await context.SaveChangesAsync();

        // Load updated driver with relationships
        var updatedDriver = await context.Employees
            .OfType<Driver>()
            .Include(d => d.TypeTruck)
            .Include(d => d.DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .FirstOrDefaultAsync(d => d.Id == id);

        var driverDto = new DriverDto
        {
            Id = updatedDriver.Id,
            IdNumber = updatedDriver.IdNumber,
            Name = updatedDriver.Name,
            Email = updatedDriver.Email,
            PhoneNumber = updatedDriver.PhoneNumber,
            PhoneCountry = updatedDriver.PhoneCountry,
            DrivingLicense = updatedDriver.DrivingLicense,
            TypeTruckId = updatedDriver.TypeTruckId,
            TypeTruck = updatedDriver.TypeTruck != null ? new TypeTruckDto
            {
                Id = updatedDriver.TypeTruck.Id,
                Type = updatedDriver.TypeTruck.Type,
                Capacity = updatedDriver.TypeTruck.Capacity,
              
            } : null,
            IsEnable = updatedDriver.IsEnable,
            EmployeeCategory = updatedDriver.EmployeeCategory,
            IsInternal = updatedDriver.IsInternal,
            Status = updatedDriver.Status,
            IdCamion = updatedDriver.IdCamion,
            ImageBase64 = updatedDriver.ImageBase64,
            GeographicalEntities = updatedDriver.DriverGeographicalEntities?
                .Where(dg => dg.GeographicalEntity != null && dg.GeographicalEntity.IsActive)
                .Select(dg => new DriverGeographicalEntityDto
                {
                    GeographicalEntityId = dg.GeographicalEntityId,
                    GeographicalEntityName = dg.GeographicalEntity.Name,
                    LevelName = dg.GeographicalEntity.Level?.Name,
                    LevelNumber = dg.GeographicalEntity.Level?.LevelNumber ?? 0,
                    Latitude = dg.GeographicalEntity.Latitude,
                    Longitude = dg.GeographicalEntity.Longitude
                }).ToList() ?? new List<DriverGeographicalEntityDto>()
        };

        return Ok(new ApiResponse(true, "Chauffeur mis à jour avec succès", driverDto));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDriver(int id)
    {
        var driver = await context.Employees
            .OfType<Driver>()
            .Include(d => d.DriverGeographicalEntities)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (driver == null)
        {
            return NotFound(new ApiResponse(false, "Chauffeur non trouvé"));
        }

        // Check if driver is used in any trips
        var hasTrips = await context.Trips.AnyAsync(t => t.DriverId == id);
        if (hasTrips)
        {
            return BadRequest(new ApiResponse(false,
                "Impossible de supprimer ce chauffeur car il est associé à des voyages"));
        }

        // Remove geographical entity associations first
        if (driver.DriverGeographicalEntities != null && driver.DriverGeographicalEntities.Any())
        {
            context.DriverGeographicalEntities.RemoveRange(driver.DriverGeographicalEntities);
        }

        // Remove the driver
        context.Employees.Remove(driver);
        await context.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Le chauffeur a été supprimé avec succès"));
    }

    [HttpGet("list")]
    [AllowAnonymous] // Allow anonymous access for driver list (used in trip creation)
    public async Task<ActionResult<IEnumerable<DriverDto>>> GetDriversList()
    {
        // Query from Users table - drivers are users with email containing "@tms.demo" or name containing "Driver"
        // This matches the new database structure where drivers are stored in Users table
        var drivers = await context.Users
            .Where(u => u.Email.Contains("@tms.demo") || (u.Name != null && u.Name.Contains("Driver")))
            .Select(u => new DriverDto
            {
                Id = u.Id, // User Id = Driver Id for SignalR notifications
                IdNumber = $"DRV-{u.Id:D4}",
                Name = u.Name ?? $"Driver {u.Id}",
                Email = u.Email ?? "",
                PhoneNumber = u.Phone ?? "",
                PhoneCountry = u.phoneCountry ?? "+216",
                DrivingLicense = "",
                TypeTruckId = null,
                TypeTruck = null,
                IsEnable = true,
                EmployeeCategory = "DRIVER",
                IsInternal = true,
                Status = "active",
                IdCamion = 0,
                ImageBase64 = null,
                GeographicalEntities = new List<DriverGeographicalEntityDto>()
            })
            .ToListAsync();

        return Ok(drivers);
    }

    /// <summary>
    /// Get all drivers without filtering by EmployeeCategory (for debugging)
    /// </summary>
    [HttpGet("all-drivers")]
    public async Task<ActionResult<IEnumerable<DriverDto>>> GetAllDrivers()
    {
        var allEmployees = await context.Employees
            .Include(e => e.TypeTruck)
            .Include(e => (e as Driver).DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .ToListAsync();

        // Filter only Driver type employees
        var drivers = allEmployees.OfType<Driver>().ToList();

        var driverDtos = drivers.Select(d => new DriverDto
        {
            Id = d.Id,
            IdNumber = d.IdNumber,
            Name = d.Name ?? $"Chauffeur {d.Id}",
            Email = d.Email ?? "",
            PhoneNumber = d.PhoneNumber ?? "",
            PhoneCountry = d.PhoneCountry ?? "+216",
            DrivingLicense = d.DrivingLicense ?? "",
            TypeTruckId = d.TypeTruckId,
            TypeTruck = d.TypeTruck != null ? new TypeTruckDto
            {
                Id = d.TypeTruck.Id,
                Type = d.TypeTruck.Type,
                Capacity = d.TypeTruck.Capacity,
            } : null,
            IsEnable = d.IsEnable,
            EmployeeCategory = d.EmployeeCategory ?? "DRIVER",
            IsInternal = d.IsInternal,
            Status = d.Status ?? "active",
            IdCamion = d.IdCamion,
            ImageBase64 = d.ImageBase64,
            GeographicalEntities = d.DriverGeographicalEntities?
                .Where(dg => dg.GeographicalEntity != null && dg.GeographicalEntity.IsActive)
                .Select(dg => new DriverGeographicalEntityDto
                {
                    GeographicalEntityId = dg.GeographicalEntityId,
                    GeographicalEntityName = dg.GeographicalEntity.Name,
                    LevelName = dg.GeographicalEntity.Level?.Name,
                    LevelNumber = dg.GeographicalEntity.Level?.LevelNumber ?? 0,
                    Latitude = dg.GeographicalEntity.Latitude,
                    Longitude = dg.GeographicalEntity.Longitude
                }).ToList() ?? new List<DriverGeographicalEntityDto>()
        }).ToList();

        return Ok(new
        {
            drivers = driverDtos,
            totalCount = drivers.Count,
            message = drivers.Count == 0 ? "No drivers found in database" : "Drivers loaded successfully"
        });
    }

    [HttpGet("by-geographical-entity/{entityId}")]
    public async Task<IActionResult> GetDriversByGeographicalEntity(int entityId)
    {
        var drivers = await context.Employees
            .OfType<Driver>()
            .Include(d => d.TypeTruck)
            .Include(d => d.DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .Where(d => d.IsEnable &&
                        d.EmployeeCategory == "DRIVER" &&
                        d.DriverGeographicalEntities.Any(dg => dg.GeographicalEntityId == entityId))
            .ToListAsync();

        var driverDtos = drivers.Select(d => new DriverDto
        {
            Id = d.Id,
            IdNumber = d.IdNumber,
            Name = d.Name,
            Email = d.Email,
            PhoneNumber = d.PhoneNumber,
            PhoneCountry = d.PhoneCountry,
            DrivingLicense = d.DrivingLicense,
            TypeTruckId = d.TypeTruckId,
            TypeTruck = d.TypeTruck != null ? new TypeTruckDto
            {
                Id = d.TypeTruck.Id,
                Type = d.TypeTruck.Type,
                Capacity = d.TypeTruck.Capacity,
               
            } : null,
            IsEnable = d.IsEnable,
            EmployeeCategory = d.EmployeeCategory,
            IsInternal = d.IsInternal,
            Status = d.Status,
            IdCamion = d.IdCamion,
            ImageBase64 = d.ImageBase64
        }).ToList();

        return Ok(driverDtos);
    }

    [HttpGet("with-coordinates")]
    public async Task<IActionResult> GetDriversWithCoordinates()
    {
        var drivers = await context.Employees
            .OfType<Driver>()
            .Include(d => d.TypeTruck)
            .Include(d => d.DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .Where(d => d.IsEnable &&
                        d.EmployeeCategory == "DRIVER" &&
                        d.DriverGeographicalEntities.Any(dg =>
                            dg.GeographicalEntity.Latitude != null &&
                            dg.GeographicalEntity.Longitude != null))
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.IdNumber,
                d.PhoneNumber,
                d.Email,
                TypeName = d.TypeTruck != null ? d.TypeTruck.Type : null,
                d.Status,
                GeographicalEntities = d.DriverGeographicalEntities
                    .Where(dg => dg.GeographicalEntity.Latitude != null && dg.GeographicalEntity.Longitude != null)
                    .Select(dg => new
                    {
                        dg.GeographicalEntityId,
                        Name = dg.GeographicalEntity.Name,
                        Level = dg.GeographicalEntity.Level != null ? dg.GeographicalEntity.Level.Name : null,
                        dg.GeographicalEntity.Latitude,
                        dg.GeographicalEntity.Longitude
                    }).ToList()
            })
            .ToListAsync();

        return Ok(drivers);
    }
}