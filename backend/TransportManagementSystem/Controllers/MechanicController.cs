using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MechanicController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;

        public MechanicController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        [HttpGet("Pagination and Search")]
        public async Task<IActionResult> GetMechanicList([FromQuery] SearchOptions searchOption)
        {
            // Use OfType<Mechanic>() to get only mechanics from Employees table
            var query = dbContext.Employees.OfType<Mechanic>().AsQueryable();

            if (!string.IsNullOrEmpty(searchOption.Search))
            {
                query = query.Where(x =>
                    (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                    (x.Email != null && x.Email.Contains(searchOption.Search)) ||
                    (x.PhoneNumber != null && x.PhoneNumber.Contains(searchOption.Search))
                );
            }

            var totalData = await query.CountAsync();

            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            var pagedData = new PagedData<Mechanic>
            {
                Data = await query.ToListAsync(),
                TotalData = totalData
            };

            return Ok(pagedData);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Mechanic>> GetMechanicById(int id)
        {
            var mechanic = await dbContext.Employees
                .OfType<Mechanic>()
                .FirstOrDefaultAsync(m => m.Id == id);

            if (mechanic == null)
                return NotFound(new
                {
                    message = $"Mechanic with ID {id} was not found in the database.",
                    Status = 404
                });

            return Ok(mechanic);
        }

        [HttpPost]
        public async Task<ActionResult<Mechanic>> CreateMechanic([FromBody] CreateMechanicRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Check if email already exists
            var emailExists = await dbContext.Employees
                .OfType<Mechanic>()
                .AnyAsync(m => m.Email == request.Email);

            if (emailExists)
            {
                return BadRequest(new
                {
                    message = $"L'email '{request.Email}' est déjà utilisé par un autre mécanicien.",
                    Status = 400
                });
            }

            // Create a new Mechanic instance (which inherits from Employee)
            var mechanic = new Mechanic
            {
                // Employee base properties
                IdNumber = request.IdNumber ?? GenerateIdNumber(),
                Name = request.Name,
                PhoneNumber = request.PhoneNumber,
                PhoneCountry = request.PhoneCountry ?? "+216",
                Email = request.Email,
                DrivingLicense = request.DrivingLicense,
                TypeTruckId = request.TypeTruckId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsEnable = true,
                EmployeeCategory = "MECHANIC", // Discriminator
                IsInternal = request.IsInternal,

      
            };

            dbContext.Employees.Add(mechanic);
            await dbContext.SaveChangesAsync();

            if (mechanic.Id == 0)
                return BadRequest("Mechanic ID was not generated. Something went wrong.");

            return CreatedAtAction(nameof(GetMechanicById), new { id = mechanic.Id }, mechanic);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMechanic(int id, [FromBody] UpdateMechanicRequest request)
        {
            var existingMechanic = await dbContext.Employees
                .OfType<Mechanic>()
                .FirstOrDefaultAsync(m => m.Id == id);

            if (existingMechanic == null)
            {
                return NotFound(new
                {
                    message = $"Mechanic with ID {id} was not found.",
                    Status = 404
                });
            }

            // Check email uniqueness if changed
            if (existingMechanic.Email != request.Email)
            {
                var emailExists = await dbContext.Employees
                    .OfType<Mechanic>()
                    .AnyAsync(m => m.Email == request.Email && m.Id != id);

                if (emailExists)
                {
                    return BadRequest(new
                    {
                        message = $"L'email '{request.Email}' est déjà utilisé par un autre mécanicien.",
                        Status = 400
                    });
                }
            }

            // Update Employee base properties
            existingMechanic.Name = request.Name;
            existingMechanic.PhoneNumber = request.PhoneNumber;
            existingMechanic.PhoneCountry = request.PhoneCountry ?? existingMechanic.PhoneCountry;
            existingMechanic.Email = request.Email;
            existingMechanic.DrivingLicense = request.DrivingLicense;
            existingMechanic.TypeTruckId = request.TypeTruckId;
            existingMechanic.UpdatedAt = DateTime.UtcNow;
            existingMechanic.IsEnable = request.IsEnable;
            existingMechanic.IsInternal = request.IsInternal;


            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Mechanic with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingMechanic
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMechanic(int id)
        {
            var existingMechanic = await dbContext.Employees
                .OfType<Mechanic>()
                .FirstOrDefaultAsync(m => m.Id == id);

            if (existingMechanic == null)
            {
                return NotFound(new
                {
                    message = $"Mechanic with ID {id} was not found.",
                    Status = 404
                });
            }

            // Soft delete - just disable
            existingMechanic.IsEnable = false;
            existingMechanic.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Mechanic with ID {id} has been disabled successfully.",
                Status = 200
            });
        }

        [HttpGet("all")]
        public async Task<ActionResult<IEnumerable<Mechanic>>> GetMechanics()
        {
            var mechanics = await dbContext.Employees
                .OfType<Mechanic>()
                .ToListAsync();

            return Ok(mechanics);
        }

        private string GenerateIdNumber()
        {
            return $"MECH{DateTime.Now.Ticks.ToString().Substring(0, 8)}";
        }
    }
}

// Request DTOs
public class CreateMechanicRequest
{
    public string? IdNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? PhoneCountry { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? DrivingLicense { get; set; }
    public int? TypeTruckId { get; set; }
    public string? Specialization { get; set; }
    public int? YearsOfExperience { get; set; }
    public bool IsInternal { get; set; } = true;
    public bool IsEnable { get; set; } = true;
}

public class UpdateMechanicRequest
{
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? PhoneCountry { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? DrivingLicense { get; set; }
    public int? TypeTruckId { get; set; }
    public string? Specialization { get; set; }
    public int? YearsOfExperience { get; set; }
    public bool IsInternal { get; set; } = true;
    public bool IsEnable { get; set; } = true;
}