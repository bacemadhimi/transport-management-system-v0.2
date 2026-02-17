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
public class LocationsController : ControllerBase
{
    private readonly IRepository<Location> locationRepository;

    public LocationsController(IRepository<Location> locationRepository)
    {
        this.locationRepository = locationRepository;
    }
    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetLocations([FromQuery] SearchOptions searchOption)
    {
        var query = locationRepository.Query().AsQueryable();

      
        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            query = query.Where(l =>
                l.Name.Contains(searchOption.Search)
            );
        }

        var totalData = await query.CountAsync();

        
        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

       
        var data = await query.Select(l => new LocationDto
        {
            Id = l.Id,
            Name = l.Name,
            IsActive = l.IsActive,
            CreatedAt = l.CreatedAt,
            UpdatedAt = l.UpdatedAt,
            ZoneId = l.ZoneId
        }).ToListAsync();

        return Ok(new PagedData<LocationDto>
        {
            TotalData = totalData,
            Data = data
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetLocations()
    {
        var locations = await locationRepository.Query()
            .Include(l => l.Zone)   
            .OrderBy(l => l.Name)
            .Select(l => new LocationDto
            {
                Id = l.Id,
                Name = l.Name,
                IsActive = l.IsActive,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt,
                ZoneId = l.ZoneId,
                ZoneName = l.Zone.Name   
            })
            .ToListAsync();

        return Ok(new ApiResponse(true, "Locations récupérées", locations));
    }



    [HttpGet("{id}")]
    public async Task<IActionResult> GetLocationById(int id)
    {
        var location = await locationRepository.Query()
            .Where(l => l.Id == id)
            .Select(l => new LocationDto
            {
                Id = l.Id,
                Name = l.Name,
                IsActive = l.IsActive,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt,
                ZoneId = l.ZoneId
            })
            .FirstOrDefaultAsync();

        if (location == null)
            return NotFound(new ApiResponse(false, $"Location {id} non trouvée"));

        return Ok(new ApiResponse(true, "Location récupérée", location));
    }

   
    [HttpPost]
    public async Task<IActionResult> CreateLocation([FromBody] CreateLocationDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var location = new Location
        {
            Name = model.Name,
            IsActive = model.IsActive ?? true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ZoneId = model.ZoneId
        };

        await locationRepository.AddAsync(location);
        await locationRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLocationById),
            new { id = location.Id },
            new ApiResponse(true, "Location créée avec succès", location.Id));
    }

  
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLocation(int id, [FromBody] UpdateLocationDto model)
    {
        var location = await locationRepository.Query().FirstOrDefaultAsync(l => l.Id == id);

        if (location == null)
            return NotFound(new ApiResponse(false, $"Location {id} non trouvée"));

        if (!string.IsNullOrWhiteSpace(model.Name))
            location.Name = model.Name;

        if (model.IsActive.HasValue)
            location.IsActive = model.IsActive.Value;

        if (model.ZoneId.HasValue)
            location.ZoneId = model.ZoneId.Value;

        location.UpdatedAt = DateTime.UtcNow;

        locationRepository.Update(location);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location mise à jour avec succès"));
    }

    
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLocation(int id)
    {
        var location = await locationRepository.Query().FirstOrDefaultAsync(l => l.Id == id);

        if (location == null)
            return NotFound(new ApiResponse(false, $"Location {id} non trouvée"));

        await locationRepository.DeleteAsync(id);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location supprimée avec succès"));
    }
}
