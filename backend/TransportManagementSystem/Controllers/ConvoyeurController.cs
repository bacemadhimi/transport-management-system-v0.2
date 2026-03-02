using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ConvoyeurController : ControllerBase
{
    private readonly ApplicationDbContext dbContext;

    public ConvoyeurController(ApplicationDbContext context)
    {
        dbContext = context;
    }


    [HttpGet("ListOfConvoyeurs")]
    public async Task<ActionResult<IEnumerable<Convoyeur>>> GetConvoyeurs()
    {
        // Use Set<Convoyeur>() instead of Convoyeurs DbSet
        var convoyeurs = await dbContext.Set<Convoyeur>()

            .ToListAsync();

        return Ok(convoyeurs);
    }


    [HttpGet("{id}")]
    public async Task<ActionResult<Convoyeur>> GetConvoyeurById(int id)
    {
        var convoyeur = await dbContext.Set<Convoyeur>()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (convoyeur == null)
        {
            return NotFound(new
            {
                message = $"Convoyeur with ID {id} was not found.",
                Status = 404
            });
        }

        return Ok(convoyeur);
    }


    [HttpPost]
    public async Task<ActionResult<Convoyeur>> CreateConvoyeur([FromBody] CreateConvoyeurRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Check if email already exists
        var emailExists = await dbContext.Set<Convoyeur>()
            .AnyAsync(c => c.Email == request.Email);

        if (emailExists)
        {
            return BadRequest(new
            {
                message = $"L'email '{request.Email}' est déjà utilisé par un autre convoyeur.",
                Status = 400
            });
        }

        // Create a new Convoyeur instance (which inherits from Employee)
        var convoyeur = new Convoyeur
        {
            IdNumber = request.IdNumber ?? GenerateIdNumber(),
            Name = request.Name,
            PhoneNumber = request.PhoneNumber,
            PhoneCountry = request.PhoneCountry ?? "+216",
            Email = request.Email,
            DrivingLicense = request.PermisNumber,
            EmployeeCategory = "CONVOYEUR", // Discriminator
            IsInternal = true,
            IsEnable = true,
            CreatedAt = DateTime.UtcNow,

            // Convoyeur-specific properties
            Matricule = request.Matricule ?? string.Empty,
            Status = request.Status ?? "ACTIVE",
    
        };

        dbContext.Set<Convoyeur>().Add(convoyeur);
        await dbContext.SaveChangesAsync();

        if (convoyeur.Id == 0)
            return BadRequest("Convoyeur ID was not generated. Something went wrong.");

        return CreatedAtAction(nameof(GetConvoyeurById), new { id = convoyeur.Id }, convoyeur);
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateConvoyeur(int id, [FromBody] UpdateConvoyeurRequest request)
    {
        var existingConvoyeur = await dbContext.Set<Convoyeur>()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (existingConvoyeur == null)
        {
            return NotFound(new
            {
                message = $"Convoyeur with ID {id} was not found.",
                Status = 404
            });
        }

        // Check email uniqueness if changed
        if (existingConvoyeur.Email != request.Email)
        {
            var emailExists = await dbContext.Set<Convoyeur>()
                .AnyAsync(c => c.Email == request.Email && c.Id != id);

            if (emailExists)
            {
                return BadRequest(new
                {
                    message = $"L'email '{request.Email}' est déjà utilisé par un autre convoyeur.",
                    Status = 400
                });
            }
        }

        // Update Employee base properties
        existingConvoyeur.Name = request.Name;
        existingConvoyeur.PhoneNumber = request.PhoneNumber;
        existingConvoyeur.PhoneCountry = request.PhoneCountry ?? existingConvoyeur.PhoneCountry;
        existingConvoyeur.Email = request.Email;
        existingConvoyeur.DrivingLicense = request.PermisNumber;
        existingConvoyeur.UpdatedAt = DateTime.UtcNow;
        existingConvoyeur.IsEnable = request.IsEnable;

        // Update Convoyeur-specific properties
        existingConvoyeur.Matricule = request.Matricule ?? existingConvoyeur.Matricule;
        existingConvoyeur.Status = request.Status ?? existingConvoyeur.Status;


        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = "Convoyeur updated successfully",
            Status = 200,
            Data = existingConvoyeur
        });
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteConvoyeur(int id)
    {
        var convoyeur = await dbContext.Set<Convoyeur>()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (convoyeur == null)
        {
            return NotFound(new
            {
                message = $"Convoyeur with ID {id} was not found.",
                Status = 404
            });
        }

        // Soft delete - just disable
        convoyeur.IsEnable = false;
        convoyeur.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = "Convoyeur disabled successfully",
            Status = 200
        });
    }


    [HttpGet("Pagination and Search")]
    public async Task<IActionResult> GetConvoyeurList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Convoyeur>();

        var query = dbContext.Set<Convoyeur>()
            .AsQueryable();

        if (!string.IsNullOrEmpty(searchOption.Search))
        {
            query = query.Where(x =>
                (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                (x.Matricule != null && x.Matricule.Contains(searchOption.Search)) ||
                x.PhoneNumber.Contains(searchOption.Search) ||
                (x.Status != null && x.Status.Contains(searchOption.Search))
            );
        }

        pagedData.TotalData = await query.CountAsync();

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        pagedData.Data = await query.ToListAsync();

        return Ok(pagedData);
    }

    private string GenerateIdNumber()
    {
        return $"CONV{DateTime.Now.Ticks.ToString().Substring(0, 8)}";
    }
}

// Request DTOs
public class CreateConvoyeurRequest
{
    public string? IdNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? PhoneCountry { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? PermisNumber { get; set; }
    public string? Matricule { get; set; }
    public string? Status { get; set; }
    public int? ZoneId { get; set; }
    public int? CityId { get; set; }
    public bool IsEnable { get; set; } = true;
}

public class UpdateConvoyeurRequest
{
    public string Name { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? PhoneCountry { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? PermisNumber { get; set; }
    public string? Matricule { get; set; }
    public string? Status { get; set; }
    public int? ZoneId { get; set; }
    public int? CityId { get; set; }
    public bool IsEnable { get; set; } = true;
}