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
        var query = locationRepository.Query()
            .Include(l => l.LocationGeographicalEntities)
                .ThenInclude(lg => lg.GeographicalEntity)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            var search = searchOption.Search.Trim();

            query = query.Where(l =>
                l.Name.Contains(search)
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

            GeographicalEntities = l.LocationGeographicalEntities?
                .Where(lg => lg.GeographicalEntity != null && lg.GeographicalEntity.IsActive)
                .Select(lg => new LocationGeographicalEntityDto
                {
                    GeographicalEntityId = lg.GeographicalEntityId,
                    Name = lg.GeographicalEntity.Name
                }).ToList() ?? new List<LocationGeographicalEntityDto>()
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
            .Include(l => l.LocationGeographicalEntities)
                .ThenInclude(lg => lg.GeographicalEntity)
            .OrderBy(l => l.Name)
            .ToListAsync();

        var result = locations.Select(l => new LocationDto
        {
            Id = l.Id,
            Name = l.Name,
            IsActive = l.IsActive,
            CreatedAt = l.CreatedAt,
            UpdatedAt = l.UpdatedAt,

            GeographicalEntities = l.LocationGeographicalEntities?
                .Where(lg => lg.GeographicalEntity != null)
                .Select(lg => new LocationGeographicalEntityDto
                {
                    GeographicalEntityId = lg.GeographicalEntityId,
                    Name = lg.GeographicalEntity.Name
                }).ToList() ?? new List<LocationGeographicalEntityDto>()
        });

        return Ok(new ApiResponse(true, "Locations récupérées", result));
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> GetLocationById(int id)
    {
        var location = await locationRepository.Query()
            .Include(l => l.LocationGeographicalEntities)
                .ThenInclude(lg => lg.GeographicalEntity)
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

            GeographicalEntities = location.LocationGeographicalEntities?
                .Where(lg => lg.GeographicalEntity != null)
                .Select(lg => new LocationGeographicalEntityDto
                {
                    GeographicalEntityId = lg.GeographicalEntityId,
                    Name = lg.GeographicalEntity.Name
                }).ToList() ?? new List<LocationGeographicalEntityDto>()
        };

        return Ok(new ApiResponse(true, "Location récupérée", dto));
    }

    [HttpPost]
    public async Task<IActionResult> CreateLocation([FromBody] CreateLocationDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        // 🔥 CORRECTION: Vérifier les entités géographiques dans la bonne table
        if (model.GeographicalEntities != null && model.GeographicalEntities.Any())
        {
            var ids = model.GeographicalEntities.Select(x => x.GeographicalEntityId).ToList();

            // Vérifier dans la table GeographicalEntities, pas dans LocationGeographicalEntities
            var existingEntities = await context.GeographicalEntities
                .Where(g => ids.Contains(g.Id) && g.IsActive)
                .Select(g => g.Id)
                .ToListAsync();

            var invalidIds = ids.Except(existingEntities).ToList();
            if (invalidIds.Any())
                return BadRequest(new ApiResponse(false, $"Invalid geographical IDs: {string.Join(",", invalidIds)}"));
        }

        var location = new Location
        {
            Name = model.Name,
            IsActive = model.IsActive ?? true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LocationGeographicalEntities = new List<LocationGeographicalEntity>()
        };

        // Ajouter les relations avec les entités géographiques
        if (model.GeographicalEntities != null)
        {
            foreach (var geo in model.GeographicalEntities)
            {
                location.LocationGeographicalEntities.Add(new LocationGeographicalEntity
                {
                    GeographicalEntityId = geo.GeographicalEntityId
                });
            }
        }

        await locationRepository.AddAsync(location);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location créée", location.Id));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateLocation(int id, [FromBody] UpdateLocationDto model)
    {
        var location = await context.Locations
            .Include(l => l.LocationGeographicalEntities)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (location == null)
            return NotFound(new ApiResponse(false, "Location not found"));

        if (!string.IsNullOrWhiteSpace(model.Name))
            location.Name = model.Name;

        if (model.IsActive.HasValue)
            location.IsActive = model.IsActive.Value;

        // Mettre à jour les relations avec les entités géographiques
        if (model.GeographicalEntities != null)
        {
            // Vérifier les IDs avant de mettre à jour
            var ids = model.GeographicalEntities.Select(x => x.GeographicalEntityId).ToList();
            var existingEntities = await context.GeographicalEntities
                .Where(g => ids.Contains(g.Id) && g.IsActive)
                .Select(g => g.Id)
                .ToListAsync();

            var invalidIds = ids.Except(existingEntities).ToList();
            if (invalidIds.Any())
                return BadRequest(new ApiResponse(false, $"Invalid geographical IDs: {string.Join(",", invalidIds)}"));

            // Supprimer les anciennes relations
            context.LocationGeographicalEntities.RemoveRange(location.LocationGeographicalEntities);

            // Ajouter les nouvelles relations
            location.LocationGeographicalEntities = model.GeographicalEntities
                .Select(g => new LocationGeographicalEntity
                {
                    LocationId = location.Id,
                    GeographicalEntityId = g.GeographicalEntityId
                }).ToList();
        }

        location.UpdatedAt = DateTime.UtcNow;

        locationRepository.Update(location);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location mise à jour"));
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLocation(int id)
    {
        var location = await context.Locations
            .Include(l => l.LocationGeographicalEntities)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (location == null)
            return NotFound(new ApiResponse(false, "Location not found"));

        if (location.LocationGeographicalEntities != null)
        {
            context.LocationGeographicalEntities.RemoveRange(location.LocationGeographicalEntities);
        }

        await locationRepository.DeleteAsync(id);
        await locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location supprimée"));
    }
}
