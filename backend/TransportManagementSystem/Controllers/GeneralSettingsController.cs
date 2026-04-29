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
public class GeneralSettingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IRepository<GeneralSettings> GeneralSettingsRepository;
    public GeneralSettingsController(ApplicationDbContext context, IRepository<GeneralSettings> GeneralSettingsRepository)
    {
        _context = context;
        this.GeneralSettingsRepository = GeneralSettingsRepository;
    }

  
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var parameters = await _context.GeneralSettings.ToListAsync();
        return Ok(parameters);
    }


    [HttpGet("type/{type}")]
    public async Task<IActionResult> GetByType(string type)
    {
        if (string.IsNullOrWhiteSpace(type))
            return BadRequest("ParameterType is required.");

        var parameters = await _context.GeneralSettings
            .Where(p => p.ParameterType.ToUpper() == type.ToUpper())
            .ToListAsync();

        return Ok(parameters);
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var parameter = await _context.GeneralSettings.FindAsync(id);
        if (parameter == null)
            return NotFound();

        return Ok(parameter);
    }


    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GeneralSettings model)
    {
        if (model == null)
            return BadRequest("Invalid data.");

  
        bool exists = await _context.GeneralSettings
            .AnyAsync(p => p.ParameterType.ToUpper() == model.ParameterType.ToUpper()
                        && p.ParameterCode.ToUpper() == model.ParameterCode.ToUpper());

        if (exists)
            return Conflict("Parameter with the same type and code already exists.");

        _context.GeneralSettings.Add(model);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = model.Id }, model);
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] GeneralSettings model)
    {
        if (model == null)
            return BadRequest("Invalid data.");

        var existing = await _context.GeneralSettings.FindAsync(id);
        if (existing == null)
            return NotFound();

        // Vérifier si un AUTRE record a déjà ce ParameterCode (conflit de clé unique)
        var conflict = await _context.GeneralSettings
            .FirstOrDefaultAsync(s => s.ParameterType == model.ParameterType 
                                   && s.ParameterCode == model.ParameterCode 
                                   && s.Id != id);
        
        if (conflict != null)
        {
            // Un autre record a déjà cette valeur - supprimer le conflit
            _context.GeneralSettings.Remove(conflict);
            await _context.SaveChangesAsync();
        }

        existing.ParameterType = model.ParameterType;
        existing.ParameterCode = model.ParameterCode;
        existing.Description = model.Description;
        existing.LogoBase64 = model.LogoBase64;
        
        try
        {
            await _context.SaveChangesAsync();
            return Ok(existing);
        }
        catch (DbUpdateException ex)
        {
            // Si toujours un conflit après suppression, retourner une erreur explicite
            return StatusCode(500, new { 
                message = "Conflit de données: impossible de sauvegarder",
                details = ex.InnerException?.Message ?? ex.Message 
            });
        }
    }


    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _context.GeneralSettings.FindAsync(id);
        if (existing == null)
            return NotFound();

        _context.GeneralSettings.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetGeneralSettings([FromQuery] SearchOptions searchOption)
    {
        var query = GeneralSettingsRepository.Query().AsQueryable();

    
        if (!string.IsNullOrWhiteSpace(searchOption.ParameterType))
        {
            query = query.Where(g => g.ParameterType == searchOption.ParameterType);
        }

        if (!string.IsNullOrWhiteSpace(searchOption.Search))
        {
            query = query.Where(g =>
                g.ParameterType.Contains(searchOption.Search) ||
                g.ParameterCode.Contains(searchOption.Search) ||
                g.Description.Contains(searchOption.Search) 
              ) ;
        }

     
        var totalData = await query.CountAsync();

     
        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        
        var data = await query
            .Select(g => new GeneralSettingsDto
            {
                Id = g.Id,
                ParameterType = g.ParameterType,
                ParameterCode = g.ParameterCode,
                Description = g.Description       
            })
            .ToListAsync();

        return Ok(new PagedData<GeneralSettingsDto>
        {
            TotalData = totalData,
            Data = data
        });
    }
    [HttpGet("by-type/{type}")]
    public async Task<IActionResult> GetSettingsByType(string type)
    {
        if (string.IsNullOrWhiteSpace(type))
            return BadRequest("Parameter type is required.");

        var settings = await _context.GeneralSettings
            .Where(g => g.ParameterType == type)
            .Select(g => new GeneralSettingsDto
            {
                Id = g.Id,
                ParameterType = g.ParameterType,
                ParameterCode = g.ParameterCode,
                Description = g.Description,
                LogoBase64 = g.LogoBase64
            })
            .ToListAsync();

        return Ok(settings);
    }
}