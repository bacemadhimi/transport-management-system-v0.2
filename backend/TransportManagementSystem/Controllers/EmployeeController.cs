using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

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


    /// Get employees with pagination and search 
    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetEmployeeList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Employee>();


        var query = dbContext.Employees
            .Include(x => x.TypeTruck)
            .Where(x => x.IsEnable == true);


        if (!string.IsNullOrEmpty(searchOption.Search))
        {
            query = query.Where(x =>
            (x.Name != null && x.Name.Contains(searchOption.Search)) ||
            (x.IdNumber != null && x.IdNumber.Contains(searchOption.Search)) ||
            (x.Email != null && x.Email.Contains(searchOption.Search)) ||
            (x.PhoneNumber != null && x.PhoneNumber.Contains(searchOption.Search)) ||
            (x.DrivingLicense != null && x.DrivingLicense.Contains(searchOption.Search)) ||
            (x.EmployeeCategory != null && x.EmployeeCategory.Contains(searchOption.Search))
        );
        }


        pagedData.TotalData = await query.CountAsync();


        query = query.OrderByDescending(x => x.CreatedAt);

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }


        pagedData.Data = await query.ToListAsync();

        return Ok(pagedData);
    }


    [HttpGet("ListOfEmployees")]
    public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
    {
        var employees = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .Where(e => e.IsEnable == true)
            .OrderBy(e => e.Name)
            .ToListAsync();

        return Ok(employees);
    }


    /// Get employee by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<Employee>> GetEmployeeById(int id)
    {
        var employee = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (employee == null)
            return NotFound(new
            {
                message = $"Employee with ID {id} was not found in the database.",
                Status = 404
            });

        return Ok(employee);
    }


    /// Create a new employee with optional file upload
    [HttpPost]
    public async Task<ActionResult<Employee>> CreateEmployee([FromForm] CreateEmployeeRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var emailExists = await dbContext.Employees
            .AnyAsync(e => e.Email == request.Email);

        if (emailExists)
        {
            return BadRequest(new
            {
                message = $"L'email '{request.Email}' est déjà utilisé par un autre employé.",
                Status = 400
            });
        }


        var idNumberExists = await dbContext.Employees
            .AnyAsync(e => e.IdNumber == request.IdNumber);

        if (idNumberExists)
        {
            return BadRequest(new
            {
                message = $"Le numéro d'identité '{request.IdNumber}' est déjà utilisé.",
                Status = 400
            });
        }

        // Create the appropriate derived type based on EmployeeCategory
        Employee employee = CreateEmployeeByCategory(request);

        if (request.DrivingLicenseFile != null)
        {
            var fileValidation = ValidateFile(request.DrivingLicenseFile);
            if (!fileValidation.IsValid)
            {
                return BadRequest(new
                {
                    message = fileValidation.ErrorMessage,
                    Status = 400
                });
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

        return CreatedAtAction(nameof(GetEmployeeById), new { id = employee.Id }, employee);
    }

    /// Helper method to create the appropriate employee type
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
                    PhoneCountry = request.PhoneCountry ?? "+216",
                    Email = request.Email,
                    DrivingLicense = request.DrivingLicense,
                    TypeTruckId = request.TypeTruckId,
                    CreatedAt = DateTime.UtcNow,
                    EmployeeCategory = "DRIVER",
                    IsInternal = request.IsInternal,
                    Status = "Disponible", // Default status for drivers
                    ImageBase64 = null
                };
                break;

            case "CONVOYEUR":
                employee = new Convoyeur
                {
                    IdNumber = request.IdNumber,
                    Name = request.Name,
                    PhoneNumber = request.PhoneNumber,
                    PhoneCountry = request.PhoneCountry ?? "+216",
                    Email = request.Email,
                    DrivingLicense = request.DrivingLicense,
                    TypeTruckId = request.TypeTruckId,
                    CreatedAt = DateTime.UtcNow,
                    EmployeeCategory = "CONVOYEUR",
                    IsInternal = request.IsInternal,
                    Matricule = request.Matricule ?? string.Empty,
                    Status = request.Status ?? "ACTIVE",
                   
                };
                break;

            default: // Regular employee
                employee = new Employee
                {
                    IdNumber = request.IdNumber,
                    Name = request.Name,
                    PhoneNumber = request.PhoneNumber,
                    PhoneCountry = request.PhoneCountry ?? "+216",
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
        const long maxFileSize = 5 * 1024 * 1024; // 5 MB
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


    /// Update an existing employee with optional file upload
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromForm] UpdateEmployeeRequest request)
    {
        var existingEmployee = await dbContext.Employees.FindAsync(id);

        if (existingEmployee == null)
        {
            return NotFound(new
            {
                message = $"Employee with ID {id} was not found.",
                Status = 404
            });
        }

        // Check if category is changing - if so, we need to handle type conversion
        if (existingEmployee.EmployeeCategory != request.EmployeeCategory)
        {
            // You might want to handle category changes carefully
            // Option 1: Reject category changes
            return BadRequest(new
            {
                message = $"Cannot change employee category from '{existingEmployee.EmployeeCategory}' to '{request.EmployeeCategory}'. Create a new employee instead.",
                Status = 400
            });

            // Option 2: If you want to allow category changes, you'd need to delete and recreate
            // But that's more complex and might lose related data
        }

        if (existingEmployee.Email != request.Email)
        {
            var emailExists = await dbContext.Employees
                .AnyAsync(e => e.Email == request.Email && e.Id != id);

            if (emailExists)
            {
                return BadRequest(new
                {
                    message = $"L'email '{request.Email}' est déjà utilisé par un autre employé.",
                    Status = 400
                });
            }
        }


        if (existingEmployee.IdNumber != request.IdNumber)
        {
            var idNumberExists = await dbContext.Employees
                .AnyAsync(e => e.IdNumber == request.IdNumber && e.Id != id);

            if (idNumberExists)
            {
                return BadRequest(new
                {
                    message = $"Le numéro d'identité '{request.IdNumber}' est déjà utilisé.",
                    Status = 400
                });
            }
        }

        // Update common properties
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

        // Update derived type specific properties
        if (existingEmployee is Driver driver)
        {
            // Update driver-specific properties
            // You might want to add these to your UpdateEmployeeRequest
            driver.Status = request.Status ?? driver.Status;
            // driver.IdCamion = request.IdCamion ?? driver.IdCamion;
        }
        else if (existingEmployee is Convoyeur convoyeur)
        {
            // Update convoyeur-specific properties
            convoyeur.Matricule = request.Matricule ?? convoyeur.Matricule;
            convoyeur.Status = request.Status ?? convoyeur.Status;
            
        }

        if (request.DrivingLicenseFile != null)
        {
            var fileValidation = ValidateFile(request.DrivingLicenseFile);
            if (!fileValidation.IsValid)
            {
                return BadRequest(new
                {
                    message = fileValidation.ErrorMessage,
                    Status = 400
                });
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

        return Ok(new
        {
            message = $"Employee with ID {id} has been updated successfully.",
            Status = 200,
            data = existingEmployee
        });
    }


    /// Download employee's driving license attachment
    [HttpGet("{id}/download-attachment")]
    public async Task<IActionResult> DownloadAttachment(int id)
    {
        var employee = await dbContext.Employees.FindAsync(id);

        if (employee == null)
        {
            return NotFound(new
            {
                message = $"Employee with ID {id} was not found.",
                Status = 404
            });
        }

        if (string.IsNullOrEmpty(employee.DrivingLicenseAttachment))
        {
            return NotFound(new
            {
                message = $"No attachment found for employee with ID {id}.",
                Status = 404
            });
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
        var employee = await dbContext.Employees.FindAsync(id);

        if (employee == null)
        {
            return NotFound(new
            {
                message = $"Employee with ID {id} was not found.",
                Status = 404
            });
        }

        employee.IsEnable = false;
        employee.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = $"Employee with ID {id} has been disabled successfully.",
            Status = 200
        });
    }

    // Add endpoint to get employees by category
    [HttpGet("by-category/{category}")]
    public async Task<IActionResult> GetEmployeesByCategory(string category)
    {
        var employees = await dbContext.Employees
            .Include(e => e.TypeTruck)
            .Where(e => e.EmployeeCategory == category && e.IsEnable == true)
            .OrderBy(e => e.Name)
            .ToListAsync();

        return Ok(employees);
    }
}