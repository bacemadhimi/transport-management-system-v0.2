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
public class GeographicalEntitiesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IRepository<GeographicalEntity> _repository;

    public GeographicalEntitiesController(ApplicationDbContext context, IRepository<GeographicalEntity> repository)
    {
        _context = context;
        _repository = repository;
    }

    // GET: api/GeographicalEntities
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entities = await _context.GeographicalEntities
            .Include(e => e.Level)
            .Include(e => e.Parent)
            .ToListAsync();
        return Ok(entities);
    }

    // GET: api/GeographicalEntities/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await _context.GeographicalEntities
            .Include(e => e.Level)
            .Include(e => e.Parent)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (entity == null)
            return NotFound();

        return Ok(entity);
    }

    // GET: api/GeographicalEntities/level/{levelId}
    [HttpGet("level/{levelId}")]
    public async Task<IActionResult> GetByLevel(int levelId)
    {
        var entities = await _context.GeographicalEntities
            .Where(e => e.LevelId == levelId)
            .Include(e => e.Level)
            .Include(e => e.Parent)
            .ToListAsync();
        return Ok(entities);
    }

    // GET: api/GeographicalEntities/tree
    [HttpGet("tree")]
    public async Task<IActionResult> GetTree()
    {
        var entities = await _context.GeographicalEntities
            .Include(e => e.Level)
            .Include(e => e.Parent)
            .ToListAsync();

        // Build tree structure
        var rootEntities = entities.Where(e => e.ParentId == null).ToList();
        foreach (var root in rootEntities)
        {
            BuildEntityTree(root, entities);
        }

        return Ok(rootEntities);
    }

    private void BuildEntityTree(GeographicalEntity parent, List<GeographicalEntity> allEntities)
    {
        parent.Children = allEntities.Where(e => e.ParentId == parent.Id).ToList();
        foreach (var child in parent.Children)
        {
            BuildEntityTree(child, allEntities);
        }
    }

    // GET: api/GeographicalEntities/children/{parentId}
    [HttpGet("children/{parentId}")]
    public async Task<IActionResult> GetChildren(int parentId)
    {
        var children = await _context.GeographicalEntities
            .Where(e => e.ParentId == parentId)
            .Include(e => e.Level)
            .ToListAsync();
        return Ok(children);
    }

    // POST: api/GeographicalEntities
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GeographicalEntity model)
    {
        if (model == null)
            return BadRequest("Invalid data.");

        // Validate level exists
        var level = await _context.GeographicalLevels.FindAsync(model.LevelId);
        if (level == null)
            return BadRequest("Invalid level ID.");

        // Validate coordinates if level is mappable
        if (level.IsMappable && (!model.Latitude.HasValue || !model.Longitude.HasValue))
            return BadRequest($"Coordinates are required for {level.Name} level.");

        // Validate parent if provided
        if (model.ParentId.HasValue)
        {
            var parent = await _context.GeographicalEntities.FindAsync(model.ParentId);
            if (parent == null)
                return BadRequest("Invalid parent ID.");

            // Check parent level is lower number
            var parentLevel = await _context.GeographicalLevels.FindAsync(parent.LevelId);
            if (parentLevel.LevelNumber >= level.LevelNumber)
                return BadRequest("Parent must be at a higher level (lower level number).");
        }

        // Check for duplicate name at same level
        bool nameExists = await _context.GeographicalEntities
            .AnyAsync(e => e.LevelId == model.LevelId && e.Name.ToUpper() == model.Name.ToUpper());

        if (nameExists)
            return Conflict("An entity with this name already exists at this level.");

        model.CreatedAt = DateTime.UtcNow;
        model.UpdatedAt = DateTime.UtcNow;
        model.IsActive = true;

        _context.GeographicalEntities.Add(model);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = model.Id }, model);
    }

    // PUT: api/GeographicalEntities/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] GeographicalEntity model)
    {
        if (model == null || id != model.Id)
            return BadRequest("Invalid data.");

        var existing = await _context.GeographicalEntities.FindAsync(id);
        if (existing == null)
            return NotFound();

        // Validate level exists
        var level = await _context.GeographicalLevels.FindAsync(model.LevelId);
        if (level == null)
            return BadRequest("Invalid level ID.");

        // Validate coordinates if level is mappable
        if (level.IsMappable && (!model.Latitude.HasValue || !model.Longitude.HasValue))
            return BadRequest($"Coordinates are required for {level.Name} level.");

        // Validate parent if provided
        if (model.ParentId.HasValue)
        {
            var parent = await _context.GeographicalEntities.FindAsync(model.ParentId);
            if (parent == null)
                return BadRequest("Invalid parent ID.");

            // Check parent level is lower number
            var parentLevel = await _context.GeographicalLevels.FindAsync(parent.LevelId);
            if (parentLevel.LevelNumber >= level.LevelNumber)
                return BadRequest("Parent must be at a higher level (lower level number).");
        }

        // Check for duplicate name at same level (excluding current)
        bool nameExists = await _context.GeographicalEntities
            .AnyAsync(e => e.LevelId == model.LevelId && e.Name.ToUpper() == model.Name.ToUpper() && e.Id != id);

        if (nameExists)
            return Conflict("An entity with this name already exists at this level.");

        existing.Name = model.Name;
        existing.LevelId = model.LevelId;
        existing.ParentId = model.ParentId;
        existing.Latitude = model.Latitude;
        existing.Longitude = model.Longitude;
        existing.IsActive = model.IsActive;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    // DELETE: api/GeographicalEntities/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _context.GeographicalEntities.FindAsync(id);
        if (existing == null)
            return NotFound();

        // Check if entity has children
        bool hasChildren = await _context.GeographicalEntities
            .AnyAsync(e => e.ParentId == id);

        if (hasChildren)
            return Conflict("Cannot delete entity because it has child entities.");

        _context.GeographicalEntities.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/GeographicalEntities/search?name={name}
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest("Search term is required.");

        var entities = await _context.GeographicalEntities
            .Where(e => e.Name.Contains(name))
            .Include(e => e.Level)
            .Include(e => e.Parent)
            .ToListAsync();

        return Ok(entities);
    }

    // GET: api/GeographicalEntities/without-coordinates
    [HttpGet("without-coordinates")]
    public async Task<IActionResult> GetWithoutCoordinates()
    {
        var entities = await _context.GeographicalEntities
            .Where(e => e.Latitude == null || e.Longitude == null)
            .Include(e => e.Level)
            .Include(e => e.Parent)
            .ToListAsync();

        return Ok(entities);
    }
}