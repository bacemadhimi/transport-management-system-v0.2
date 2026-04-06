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
    private readonly ApplicationDbContext context;
    public LocationsController(IRepository<Location> locationRepository, ApplicationDbContext context)
    {
        this.locationRepository = locationRepository;
        this.context = context;
    }
    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetLocations([FromQuery] SearchOptions searchOption)
    {
        var query = locationRepository.Query().AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            var search = searchOption.Search.Trim();

            query = query.Where(l =>
                l.Name.Contains(search) ||
                l.Address.Contains(search)
            );
        }

        var totalData = await query.CountAsync();

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        var data = await query.ToListAsync();

        var result = data.Select(l => new LocationDto
        {
            Id = l.Id,
            Name = l.Name,
            IsActive = l.IsActive,
            CreatedAt = l.CreatedAt,
            UpdatedAt = l.UpdatedAt,
            Address = l.Address,
            Longitude = l.Longitude ?? 0,
            Latitude = l.Latitude ?? 0
        }).ToList();

        return Ok(new PagedData<LocationDto>
        {
            TotalData = totalData,
            Data = result
        });
    }
    [HttpGet]
    public async Task<IActionResult> GetLocations()
    {
        var locations = await locationRepository.Query()
            .OrderBy(l => l.Name)
            .ToListAsync();

        var result = locations.Select(l => new LocationDto
        {
            Id = l.Id,
            Name = l.Name,
            IsActive = l.IsActive,
            CreatedAt = l.CreatedAt,
            UpdatedAt = l.UpdatedAt,
            Address = l.Address,
            Longitude = l.Longitude ?? 0,
            Latitude = l.Latitude ?? 0
        });

        return Ok(new ApiResponse(true, "Locations récupérées", result));
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> GetLocationById(int id)
    {
        var location = await locationRepository.Query()
            .FirstOrDefaultAsync(l => l.Id == id);

        if (location == null)
            return NotFound(new ApiResponse(false, $"Location {id} non trouvée"));

        var dto = new LocationDto
        {
            Id = location.Id,
            Name = location.Name,
            IsActive = location.IsActive,
            CreatedAt = location.CreatedAt,
            UpdatedAt = location.UpdatedAt,
            Address = location.Address,
            Longitude = location.Longitude ?? 0,
            Latitude = location.Latitude ?? 0
        };

        return Ok(new ApiResponse(true, "Location récupérée", dto));
    }

    [HttpPost]
    public async Task<IActionResult> CreateLocation([FromBody] CreateLocationDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var location = new Location
        {
            Name = model.Name,
            Address = model.Address,
            Latitude = model.Latitude,
            Longitude = model.Longitude,
            IsActive = model.IsActive ?? true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await locationRepository.AddAsync(location);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location créée", location.Id));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLocation(int id, [FromBody] UpdateLocationDto model)
    {
        var location = await context.Locations
            .FirstOrDefaultAsync(l => l.Id == id);

        if (location == null)
            return NotFound(new ApiResponse(false, "Location not found"));

        if (!string.IsNullOrWhiteSpace(model.Name))
            location.Name = model.Name;

        location.Address = model.Address;
        location.Latitude = model.Latitude;
        location.Longitude = model.Longitude;

        if (model.IsActive.HasValue)
            location.IsActive = model.IsActive.Value;

        location.UpdatedAt = DateTime.UtcNow;

        locationRepository.Update(location);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location mise à jour"));
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLocation(int id)
    {
        var location = await context.Locations
            .FirstOrDefaultAsync(l => l.Id == id);

        if (location == null)
            return NotFound(new ApiResponse(false, "Location not found"));

        await locationRepository.DeleteAsync(id);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location supprimée"));
    }
}
