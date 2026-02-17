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
public class ZonesController : ControllerBase
{
    private readonly IRepository<Zone> zoneRepository;

    public ZonesController(IRepository<Zone> zoneRepository)
    {
        this.zoneRepository = zoneRepository;
    }

    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetZones([FromQuery] SearchOptions searchOption)
    {
        var query = zoneRepository.Query().AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            query = query.Where(z => z.Name.Contains(searchOption.Search));
        }

        var totalData = await query.CountAsync();

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        var data = await query.Select(z => new ZoneDto
        {
            Id = z.Id,
            Name = z.Name,
            IsActive = z.IsActive,
            CreatedAt = z.CreatedAt,
            UpdatedAt = z.UpdatedAt
        }).ToListAsync();

        return Ok(new PagedData<ZoneDto>
        {
            TotalData = totalData,
            Data = data
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetZoneById(int id)
    {
        var zone = await zoneRepository.Query()
            .Where(z => z.Id == id)
            .Select(z => new ZoneDto
            {
                Id = z.Id,
                Name = z.Name,
                IsActive = z.IsActive,
                CreatedAt = z.CreatedAt,
                UpdatedAt = z.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (zone == null)
            return NotFound(new ApiResponse(false, $"Zone {id} non trouvée"));

        return Ok(new ApiResponse(true, "Zone récupérée", zone));
    }

    [HttpPost]
    public async Task<IActionResult> CreateZone([FromBody] CreateZoneDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var zone = new Zone
        {
            Name = model.Name,
            IsActive = model.IsActive ?? true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await zoneRepository.AddAsync(zone);
        await zoneRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetZoneById),
            new { id = zone.Id },
            new ApiResponse(true, "Zone créée avec succès", zone.Id));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateZone(int id, [FromBody] UpdateZoneDto model)
    {
        var zone = await zoneRepository.Query().FirstOrDefaultAsync(z => z.Id == id);

        if (zone == null)
            return NotFound(new ApiResponse(false, $"Zone {id} non trouvée"));

        if (!string.IsNullOrWhiteSpace(model.Name))
            zone.Name = model.Name;

        if (model.IsActive.HasValue)
            zone.IsActive = model.IsActive.Value;

        zone.UpdatedAt = DateTime.UtcNow;

        zoneRepository.Update(zone);
        await zoneRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Zone mise à jour avec succès"));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteZone(int id)
    {
        var zone = await zoneRepository.Query().FirstOrDefaultAsync(z => z.Id == id);

        if (zone == null)
            return NotFound(new ApiResponse(false, $"Zone {id} non trouvée"));

        await zoneRepository.DeleteAsync(id);
        await zoneRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Zone supprimée avec succès"));
    }

    
    [HttpGet]
    public async Task<IActionResult> GetZones([FromQuery] bool? activeOnly = null)
    {
        var query = zoneRepository.Query();

        if (activeOnly.HasValue && activeOnly.Value)
        {
            query = query.Where(z => z.IsActive);
        }

        var zones = await query
            .OrderBy(z => z.Name)
            .Select(z => new ZoneDto
            {
                Id = z.Id,
                Name = z.Name,
                IsActive = z.IsActive,
                CreatedAt = z.CreatedAt,
                UpdatedAt = z.UpdatedAt
            })
            .ToListAsync();

        var message = activeOnly.HasValue && activeOnly.Value
            ? "Zones actives récupérées"
            : "Zones récupérées";

        return Ok(new ApiResponse(true, message, zones));
    }
}
