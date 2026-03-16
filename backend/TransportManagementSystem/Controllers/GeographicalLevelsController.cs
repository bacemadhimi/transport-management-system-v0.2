using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;


namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GeographicalLevelsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IRepository<GeographicalLevel> _repository;

    public GeographicalLevelsController(ApplicationDbContext context, IRepository<GeographicalLevel> repository)
    {
        _context = context;
        _repository = repository;
    }

    // GET: api/GeographicalLevels
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var levels = await _context.GeographicalLevels
            .OrderBy(l => l.LevelNumber)
            .ToListAsync();
        return Ok(levels);
    }

    // GET: api/GeographicalLevels/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var level = await _context.GeographicalLevels.FindAsync(id);
        if (level == null)
            return NotFound();

        return Ok(level);
    }

    // GET: api/GeographicalLevels/active
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var levels = await _context.GeographicalLevels
            .Where(l => l.IsActive)
            .OrderBy(l => l.LevelNumber)
            .ToListAsync();
        return Ok(levels);
    }

    // GET: api/GeographicalLevels/mappable
    [HttpGet("mappable")]
    public async Task<IActionResult> GetMappable()
    {
        var levels = await _context.GeographicalLevels
            .Where(l => l.IsMappable && l.IsActive)
            .OrderBy(l => l.LevelNumber)
            .ToListAsync();
        return Ok(levels);
    }

    // POST: api/GeographicalLevels
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GeographicalLevel model)
    {
        if (model == null)
            return BadRequest("Invalid data.");

        // Validate level number is between 1 and 5
        if (model.LevelNumber < 1 || model.LevelNumber > 5)
            return BadRequest("Level number must be between 1 and 5.");

        // Check if level number already exists
        bool numberExists = await _context.GeographicalLevels
            .AnyAsync(l => l.LevelNumber == model.LevelNumber);

        if (numberExists)
            return Conflict($"Level number {model.LevelNumber} already exists.");

        // Check if name already exists
        bool nameExists = await _context.GeographicalLevels
            .AnyAsync(l => l.Name.ToUpper() == model.Name.ToUpper());

        if (nameExists)
            return Conflict("A level with this name already exists.");

        model.CreatedAt = DateTime.UtcNow;
        model.UpdatedAt = DateTime.UtcNow;

        _context.GeographicalLevels.Add(model);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = model.Id }, model);
    }

    // PUT: api/GeographicalLevels/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] GeographicalLevel model)
    {
        if (model == null || id != model.Id)
            return BadRequest("Invalid data.");

        var existing = await _context.GeographicalLevels.FindAsync(id);
        if (existing == null)
            return NotFound();

        // Validate level number is between 1 and 5
        if (model.LevelNumber < 1 || model.LevelNumber > 5)
            return BadRequest("Level number must be between 1 and 5.");

        // Check if level number already exists (excluding current)
        bool numberExists = await _context.GeographicalLevels
            .AnyAsync(l => l.LevelNumber == model.LevelNumber && l.Id != id);

        if (numberExists)
            return Conflict($"Level number {model.LevelNumber} already exists.");

        // Check if name already exists (excluding current)
        bool nameExists = await _context.GeographicalLevels
            .AnyAsync(l => l.Name.ToUpper() == model.Name.ToUpper() && l.Id != id);

        if (nameExists)
            return Conflict("A level with this name already exists.");

        existing.Name = model.Name;
        existing.LevelNumber = model.LevelNumber;
        existing.IsMappable = model.IsMappable;
        existing.IsActive = model.IsActive;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    // PUT: api/GeographicalLevels/bulk
    [HttpPut("bulk")]
    public async Task<IActionResult> BulkUpdate([FromBody] List<GeographicalLevel> levels)
    {
        if (levels == null || !levels.Any())
            return BadRequest("No levels provided.");

        // Validate all levels
        foreach (var level in levels)
        {
            if (level.LevelNumber < 1 || level.LevelNumber > 5)
                return BadRequest($"Level {level.Name} has invalid level number. Must be between 1 and 5.");

            // Check for duplicate level numbers in the request
            if (levels.Count(l => l.LevelNumber == level.LevelNumber) > 1)
                return BadRequest($"Duplicate level number {level.LevelNumber} in request.");
        }

        // Update each level
        foreach (var level in levels)
        {
            if (level.Id > 0)
            {
                var existing = await _context.GeographicalLevels.FindAsync(level.Id);
                if (existing != null)
                {
                    existing.Name = level.Name;
                    existing.LevelNumber = level.LevelNumber;
                    existing.IsMappable = level.IsMappable;
                    existing.IsActive = level.IsActive;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                level.CreatedAt = DateTime.UtcNow;
                level.UpdatedAt = DateTime.UtcNow;
                _context.GeographicalLevels.Add(level);
            }
        }

        await _context.SaveChangesAsync();
        return Ok(await _context.GeographicalLevels.OrderBy(l => l.LevelNumber).ToListAsync());
    }

    // DELETE: api/GeographicalLevels/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _context.GeographicalLevels.FindAsync(id);
        if (existing == null)
            return NotFound();

        // Check if level is being used by any geographical entities
        bool isUsed = await _context.GeographicalEntities
            .AnyAsync(e => e.LevelId == id);

        if (isUsed)
            return Conflict("Cannot delete level because it is being used by geographical entities.");

        _context.GeographicalLevels.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}