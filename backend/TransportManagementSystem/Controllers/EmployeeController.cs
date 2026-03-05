using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Service;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EmployeeController : ControllerBase
{
    private readonly ApplicationDbContext dbContext;
    private readonly IRepository<Employee> employeeRepository;

    public EmployeeController(
        ApplicationDbContext context,
        IRepository<Employee> employeeRepository)
    {
        dbContext = context;
        this.employeeRepository = employeeRepository;
    }

    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetEmployeeList([FromQuery] SearchOptions searchOption)
    {
        
        var query = dbContext.Employees
            .AsNoTracking()
            .Where(x => x.IsEnable);

    
        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            var search = searchOption.Search.Trim();

            query = query.Where(x =>
                x.Name.StartsWith(search) ||
                x.IdNumber.StartsWith(search) ||
                x.Email.StartsWith(search) ||
                x.PhoneNumber.StartsWith(search)
            );
        }

   
        var total = await query.CountAsync();

      
        var data = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip(searchOption.PageIndex!.Value * searchOption.PageSize!.Value)
            .Take(searchOption.PageSize.Value)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.IdNumber, 
                x.DrivingLicense,
                x.Email,
                x.PhoneNumber,
                x.EmployeeCategory,
                TruckType = x.TypeTruck.Type,   
                x.AttachmentFileType,          
                x.CreatedAt,
                x.IsInternal,
            })
            .ToListAsync();

        return Ok(new
        {
            TotalData = total,
            Data = data
        });
    }
    [HttpGet("ListOfEmployees")]
    public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
    {
        var employees = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .Include(e => (e as Driver).DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .Where(e => e.IsEnable == true)
            .OrderBy(e => e.Name)
            .ToListAsync();

        return Ok(employees);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Employee>> GetEmployeeById(int id)
    {
        var employee = await dbContext.Employees
             .AsNoTracking() 
             .Where(e => e.Id == id)
             .Include(e => e.TypeTruck) 
             .Include(e => (e as Driver).DriverGeographicalEntities) 
             .ThenInclude(dg => dg.GeographicalEntity)
             .ThenInclude(g => g.Level) 
             .Include(e => e.TypeTruck)
             .Include(e => (e as Driver).DriverGeographicalEntities) 
                 .ThenInclude(dg => dg.GeographicalEntity) 
                     .ThenInclude(g => g.Level) 
             .AsSplitQuery() 
             .FirstOrDefaultAsync();

        if (employee == null)
            return NotFound(new ApiResponse(false, $"Employé {id} non trouvé"));
        return Ok(new ApiResponse(true, "Employé récupéré avec succès", employee));
    }


    [HttpPost]
    public async Task<ActionResult<Employee>> CreateEmployee([FromForm] CreateEmployeeRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        var emailExists = await dbContext.Employees
            .AnyAsync(e => e.Email == request.Email);

        if (emailExists)
        {
            return BadRequest(new ApiResponse(false, $"L'email '{request.Email}' est déjà utilisé par un autre employé."));
        }

        var idNumberExists = await dbContext.Employees
            .AnyAsync(e => e.IdNumber == request.IdNumber);

        if (idNumberExists)
        {
            return BadRequest(new ApiResponse(false, $"Le numéro d'identité '{request.IdNumber}' est déjà utilisé."));
        }

        if (!string.IsNullOrEmpty(request.GeographicalEntities))
        {
            try
            {
                var geoEntities = JsonSerializer.Deserialize<List<DriverGeographicalEntityDto>>(request.GeographicalEntities, options);

                if (geoEntities != null && geoEntities.Any())
                {
                    var entityIds = geoEntities.Select(g => g.GeographicalEntityId).ToList();
                    var validEntities = await dbContext.GeographicalEntities
                        .Where(g => entityIds.Contains(g.Id) && g.IsActive)
                        .Select(g => g.Id)
                        .ToListAsync();

                    var invalidIds = entityIds.Except(validEntities).ToList();
                    if (invalidIds.Any())
                    {
                        return BadRequest(new ApiResponse(false,
                            $"Les entités géographiques avec IDs {string.Join(", ", invalidIds)} sont invalides ou inactives"));
                    }
                }
            }
            catch (JsonException)
            {
                return BadRequest(new ApiResponse(false, "Format des entités géographiques invalide"));
            }
        }

       
        Employee employee = CreateEmployeeByCategory(request);

    
        if (request.EmployeeCategory?.ToUpper() == "DRIVER" && !string.IsNullOrEmpty(request.GeographicalEntities))
        {
            try
            {
                var geoEntities = JsonSerializer.Deserialize<List<DriverGeographicalEntityDto>>(request.GeographicalEntities, options);

                if (geoEntities != null && geoEntities.Any())
                {
                    if (employee is Driver driver)
                    {
                        driver.DriverGeographicalEntities = geoEntities.Select(g => new DriverGeographicalEntity
                        {
                            GeographicalEntityId = g.GeographicalEntityId
                        }).ToList();
                    }
                }
            }
            catch (JsonException)
            {
                return BadRequest(new ApiResponse(false, "Format des entités géographiques invalide"));
            }
        }

        if (request.DrivingLicenseFile != null)
        {
            var fileValidation = ValidateFile(request.DrivingLicenseFile);
            if (!fileValidation.IsValid)
            {
                return BadRequest(new ApiResponse(false, fileValidation.ErrorMessage));
            }

            using (var memoryStream = new MemoryStream())
            {
                await request.DrivingLicenseFile.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();
                employee.DrivingLicenseAttachment = Convert.ToBase64String(fileBytes);
                employee.AttachmentFileName = request.DrivingLicenseFile.FileName;
                employee.AttachmentFileType = Path.GetExtension(request.DrivingLicenseFile.FileName).TrimStart('.');
            }
        }

        dbContext.Employees.Add(employee);
        await dbContext.SaveChangesAsync();
        if (employee.EmployeeCategory == "DRIVER")
        {
            var passwordHelper = new PasswordHelper();

            var existingUser = await dbContext.Users
                .FirstOrDefaultAsync(u => u.Email == employee.Email);

            if (existingUser == null)
            {
                var driverGroup = await dbContext.UserGroups
                    .FirstOrDefaultAsync(g => g.Name == "Driver");

                var user = new User
                {
                    Name = employee.Name,
                    Email = employee.Email,
                    Phone = employee.PhoneNumber,
                    Password = passwordHelper.HashPassword("12345"),
                    UserGroup2Users = new List<UserGroup2User>()
                };

                if (driverGroup != null)
                {
                    user.UserGroup2Users.Add(new UserGroup2User
                    {
                        UserGroupId = driverGroup.Id
                    });
                }

                dbContext.Users.Add(user);
                await dbContext.SaveChangesAsync();
            }
        }
        var createdEmployee = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .Include(e => (e as Driver).DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .FirstOrDefaultAsync(e => e.Id == employee.Id);

        return CreatedAtAction(nameof(GetEmployeeById), new { id = employee.Id },
            new ApiResponse(true, "Employé créé avec succès", createdEmployee));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromForm] UpdateEmployeeRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        var existingEmployee = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .Include(e => (e as Driver).DriverGeographicalEntities)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (existingEmployee == null)
        {
            return NotFound(new ApiResponse(false, $"Employé {id} non trouvé"));
        }

     
        if (existingEmployee.EmployeeCategory != request.EmployeeCategory)
        {
            return BadRequest(new ApiResponse(false,
                $"Impossible de changer la catégorie d'employé de '{existingEmployee.EmployeeCategory}' à '{request.EmployeeCategory}'. Créez un nouvel employé à la place."));
        }

        if (existingEmployee.Email != request.Email)
        {
            var emailExists = await dbContext.Employees
                .AnyAsync(e => e.Email == request.Email && e.Id != id);

            if (emailExists)
            {
                return BadRequest(new ApiResponse(false, $"L'email '{request.Email}' est déjà utilisé par un autre employé."));
            }
        }

        if (existingEmployee.IdNumber != request.IdNumber)
        {
            var idNumberExists = await dbContext.Employees
                .AnyAsync(e => e.IdNumber == request.IdNumber && e.Id != id);

            if (idNumberExists)
            {
                return BadRequest(new ApiResponse(false, $"Le numéro d'identité '{request.IdNumber}' est déjà utilisé."));
            }
        }

       
        List<DriverGeographicalEntityDto>? geographicalEntities = null;
        if (!string.IsNullOrEmpty(request.GeographicalEntities))
        {
            try
            {
                geographicalEntities = JsonSerializer.Deserialize<List<DriverGeographicalEntityDto>>(request.GeographicalEntities, options);

                if (geographicalEntities != null && geographicalEntities.Any())
                {
                    var entityIds = geographicalEntities.Select(g => g.GeographicalEntityId).ToList();
                    var validEntities = await dbContext.GeographicalEntities
                        .Where(g => entityIds.Contains(g.Id) && g.IsActive)
                        .Select(g => g.Id)
                        .ToListAsync();

                    var invalidIds = entityIds.Except(validEntities).ToList();
                    if (invalidIds.Any())
                        return BadRequest(new ApiResponse(false,
                            $"Les entités géographiques avec IDs {string.Join(", ", invalidIds)} sont invalides ou inactives"));
                }
            }
            catch (JsonException)
            {
                return BadRequest(new ApiResponse(false, "Format des entités géographiques invalide"));
            }
        }

    
        existingEmployee.IdNumber = request.IdNumber;
        existingEmployee.Name = request.Name;
        existingEmployee.PhoneNumber = request.PhoneNumber;
        existingEmployee.PhoneCountry = request.PhoneCountry ?? existingEmployee.PhoneCountry;
        existingEmployee.Email = request.Email;
        existingEmployee.DrivingLicense = request.DrivingLicense;
        existingEmployee.TypeTruckId = request.TypeTruckId;
        existingEmployee.IsEnable = request.IsEnable;
        existingEmployee.UpdatedAt = DateTime.UtcNow;
        existingEmployee.EmployeeCategory = request.EmployeeCategory;
        existingEmployee.IsInternal = request.IsInternal;

        
        if (existingEmployee is Driver driver)
        {
           
            driver.Status = request.Status ?? driver.Status;

            
            if (geographicalEntities != null)
            {
              
                if (driver.DriverGeographicalEntities != null && driver.DriverGeographicalEntities.Any())
                {
                    dbContext.DriverGeographicalEntities.RemoveRange(driver.DriverGeographicalEntities);
                }

             
                if (geographicalEntities.Any())
                {
                    driver.DriverGeographicalEntities = geographicalEntities.Select(geoDto => new DriverGeographicalEntity
                    {
                        DriverId = driver.Id,
                        GeographicalEntityId = geoDto.GeographicalEntityId
                    }).ToList();
                }
            }
        }
        else if (existingEmployee is Convoyeur convoyeur)
        {
            convoyeur.Matricule = request.Matricule ?? convoyeur.Matricule;
            convoyeur.Status = request.Status ?? convoyeur.Status;
        }

        if (request.DrivingLicenseFile != null)
        {
            var fileValidation = ValidateFile(request.DrivingLicenseFile);
            if (!fileValidation.IsValid)
            {
                return BadRequest(new ApiResponse(false, fileValidation.ErrorMessage));
            }

            using (var memoryStream = new MemoryStream())
            {
                await request.DrivingLicenseFile.CopyToAsync(memoryStream);
                var fileBytes = memoryStream.ToArray();
                existingEmployee.DrivingLicenseAttachment = Convert.ToBase64String(fileBytes);
                existingEmployee.AttachmentFileName = request.DrivingLicenseFile.FileName;
                existingEmployee.AttachmentFileType = Path.GetExtension(request.DrivingLicenseFile.FileName).TrimStart('.');
            }
        }

        await dbContext.SaveChangesAsync();

       
        var updatedEmployee = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .Include(e => (e as Driver).DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .FirstOrDefaultAsync(e => e.Id == id);

        return Ok(new ApiResponse(true, "Employé mis à jour avec succès", updatedEmployee));
    }
  
    private Employee CreateEmployeeByCategory(CreateEmployeeRequest request)
    {
        Employee employee;

        switch (request.EmployeeCategory?.ToUpper())
        {
            case "DRIVER":
                employee = new Driver
                {
                    IdNumber = request.IdNumber,
                    Name = request.Name,
                    PhoneNumber = request.PhoneNumber,
                    PhoneCountry = request.PhoneCountry ?? "tn",
                    Email = request.Email,
                    DrivingLicense = request.DrivingLicense,
                    TypeTruckId = request.TypeTruckId,
                    CreatedAt = DateTime.UtcNow,
                    EmployeeCategory = "DRIVER",
                    IsInternal = request.IsInternal,
                    Status = "Disponible",
                    ImageBase64 = null,
                    DriverGeographicalEntities = new List<DriverGeographicalEntity>()
                };
                break;

            case "CONVOYEUR":
                employee = new Convoyeur
                {
                    IdNumber = request.IdNumber,
                    Name = request.Name,
                    PhoneNumber = request.PhoneNumber,
                    PhoneCountry = request.PhoneCountry ?? "tn",
                    Email = request.Email,
                    DrivingLicense = request.DrivingLicense,
                    TypeTruckId = request.TypeTruckId,
                    CreatedAt = DateTime.UtcNow,
                    EmployeeCategory = "CONVOYEUR",
                    IsInternal = request.IsInternal,
                    Matricule = request.Matricule ?? string.Empty,
                    Status = request.Status ?? "Disponible",
                };
                break;

            default:
                employee = new Employee
                {
                    IdNumber = request.IdNumber,
                    Name = request.Name,
                    PhoneNumber = request.PhoneNumber,
                    PhoneCountry = request.PhoneCountry ?? "tn",
                    Email = request.Email,
                    DrivingLicense = request.DrivingLicense,
                    TypeTruckId = request.TypeTruckId,
                    CreatedAt = DateTime.UtcNow,
                    EmployeeCategory = request.EmployeeCategory ?? "EMPLOYEE",
                    IsInternal = request.IsInternal
                };
                break;
        }

        return employee;
    }

    private (bool IsValid, string ErrorMessage) ValidateFile(IFormFile file)
    {
        const long maxFileSize = 5 * 1024 * 1024; 
        var allowedExtensions = new[] { "jpg", "jpeg", "png", "pdf", "doc", "docx", "gif", "bmp" };

        if (file.Length > maxFileSize)
        {
            return (false, "La taille du fichier dépasse 5 MB.");
        }

        var fileExtension = Path.GetExtension(file.FileName).TrimStart('.').ToLower();
        if (!allowedExtensions.Contains(fileExtension))
        {
            return (false, $"Type de fichier non autorisé. Fichiers acceptés: {string.Join(", ", allowedExtensions)}");
        }

        return (true, "");
    }

   
    [HttpGet("{id}/download-attachment")]
    public async Task<IActionResult> DownloadAttachment(int id)
    {
        var employee = await dbContext.Employees.FindAsync(id);

        if (employee == null)
        {
            return NotFound(new ApiResponse(false, $"Employé {id} non trouvé"));
        }

        if (string.IsNullOrEmpty(employee.DrivingLicenseAttachment))
        {
            return NotFound(new ApiResponse(false, $"Aucun fichier trouvé pour l'employé {id}"));
        }

        var fileBytes = Convert.FromBase64String(employee.DrivingLicenseAttachment);
        var fileName = $"{employee.Name}_DrivingLicense.{employee.AttachmentFileType}";

        return File(fileBytes, GetMimeType(employee.AttachmentFileType), fileName);
    }

    private string GetMimeType(string fileExtension)
    {
        return fileExtension?.ToLower() switch
        {
            "jpg" or "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "bmp" => "image/bmp",
            "pdf" => "application/pdf",
            "doc" => "application/msword",
            "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream"
        };
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var employee = await dbContext.Employees
            .Include(e => (e as Driver).DriverGeographicalEntities)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (employee == null)
        {
            return NotFound(new ApiResponse(false, $"Employé {id} non trouvé"));
        }

        // Check if employee is used in any trips
        var hasTrips = await dbContext.Trips.AnyAsync(t => t.DriverId == id);
        if (hasTrips)
        {
            return BadRequest(new ApiResponse(false,
                "Impossible de supprimer cet employé car il est associé à des voyages"));
        }

       
        if (employee is Driver driver && driver.DriverGeographicalEntities != null && driver.DriverGeographicalEntities.Any())
        {
            dbContext.DriverGeographicalEntities.RemoveRange(driver.DriverGeographicalEntities);
        }

        employee.IsEnable = false;
        employee.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return Ok(new ApiResponse(true, $"Employé {id} a été désactivé avec succès"));
    }

   
    [HttpGet("by-category/{category}")]
    public async Task<IActionResult> GetEmployeesByCategory(string category)
    {
        var employees = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .Include(e => (e as Driver).DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .Where(e => e.EmployeeCategory == category && e.IsEnable == true)
            .OrderBy(e => e.Name)
            .ToListAsync();

        return Ok(employees);
    }

   
    [HttpGet("by-geographical-entity/{entityId}")]
    public async Task<IActionResult> GetDriversByGeographicalEntity(int entityId)
    {
        var drivers = await dbContext.Employees
            .OfType<Driver>()
            .Include(d => d.TypeTruck)
            .Include(d => d.DriverGeographicalEntities)
                .ThenInclude(dg => dg.GeographicalEntity)
                    .ThenInclude(g => g.Level)
            .Where(d => d.IsEnable &&
                        d.EmployeeCategory == "DRIVER" &&
                        d.DriverGeographicalEntities.Any(dg => dg.GeographicalEntityId == entityId))
            .ToListAsync();

        return Ok(drivers);
    }

  
    [HttpGet("with-coordinates")]
    public async Task<IActionResult> GetDriversWithCoordinates()
    {
        var drivers = await dbContext.Employees
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