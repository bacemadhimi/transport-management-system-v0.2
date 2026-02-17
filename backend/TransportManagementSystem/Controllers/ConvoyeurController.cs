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
        return await dbContext.Convoyeurs.ToListAsync();
    }

 
    [HttpGet("{id}")]
    public async Task<ActionResult<Convoyeur>> GetConvoyeurById(int id)
    {
        var convoyeur = await dbContext.Convoyeurs.FindAsync(id);

        if (convoyeur == null)
        {
            return NotFound(new
            {
                message = $"Convoyeur with ID {id} was not found.",
                Status = 404
            });
        }

        return convoyeur;
    }

   
    [HttpPost]
    public async Task<ActionResult<Convoyeur>> CreateConvoyeur(Convoyeur convoyeur)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        dbContext.Convoyeurs.Add(convoyeur);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetConvoyeurById), new { id = convoyeur.Id }, convoyeur);
    }

   
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateConvoyeur(int id, Convoyeur convoyeur)
    {
        var existingConvoyeur = await dbContext.Convoyeurs.FindAsync(id);

        if (existingConvoyeur == null)
        {
            return NotFound(new
            {
                message = $"Convoyeur with ID {id} was not found.",
                Status = 404
            });
        }

        existingConvoyeur.Name = convoyeur.Name;
        existingConvoyeur.Matricule = convoyeur.Matricule;
        existingConvoyeur.Phone = convoyeur.Phone;
        existingConvoyeur.Status = convoyeur.Status;
        existingConvoyeur.PhoneCountry = convoyeur.PhoneCountry;
        existingConvoyeur.PermisNumber = convoyeur.PermisNumber;
        existingConvoyeur.ZoneId = convoyeur.ZoneId;
        existingConvoyeur.CityId = convoyeur.CityId;

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
        var convoyeur = await dbContext.Convoyeurs.FindAsync(id);

        if (convoyeur == null)
        {
            return NotFound(new
            {
                message = $"Convoyeur with ID {id} was not found.",
                Status = 404
            });
        }

        dbContext.Convoyeurs.Remove(convoyeur);
        await dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = "Convoyeur deleted successfully",
            Status = 200
        });
    }

   
    [HttpGet("Pagination and Search")]
    public async Task<IActionResult> GetConvoyeurList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Convoyeur>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await dbContext.Convoyeurs.ToListAsync();
        }
        else
        {
            pagedData.Data = await dbContext.Convoyeurs
                .Where(x =>
                    (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                    (x.Matricule != null && x.Matricule.Contains(searchOption.Search)) ||
                    x.Phone.Contains(searchOption.Search) ||
                    (x.Status != null && x.Status.Contains(searchOption.Search))
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

}
