using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DayOffController : ControllerBase
{
    private readonly ApplicationDbContext dbContext;

    public DayOffController(ApplicationDbContext context)
    {
        dbContext = context;
    }

    
    [HttpGet("Pagination and Search")]
    public async Task<IActionResult> GetDayOffs([FromQuery] SearchOptions searchOption, [FromQuery] string country = null, [FromQuery] int? year = null)
    {
        var query = dbContext.DayOffs.AsQueryable();

       
        if (!string.IsNullOrEmpty(country))
            query = query.Where(d => d.Country == country);

       
        if (year.HasValue)
            query = query.Where(d => d.Date.Year == year.Value);

        
        if (!string.IsNullOrEmpty(searchOption.Search))
            query = query.Where(d =>
                (d.Name != null && d.Name.Contains(searchOption.Search)) ||
                (d.Description != null && d.Description.Contains(searchOption.Search))
            );

        var totalData = await query.CountAsync();

       
        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        var pagedData = new PagedData<DayOff>
        {
            Data = await query.ToListAsync(),
            TotalData = totalData
        };

        return Ok(pagedData);
    }

 
    [HttpGet("{id}")]
    public async Task<ActionResult<DayOff>> GetDayOff(int id)
    {
        var dayOff = await dbContext.DayOffs.FindAsync(id);
        if (dayOff == null)
            return NotFound(new { message = $"DayOff with ID {id} not found.", Status = 404 });
        return dayOff;
    }

   
    [HttpPost]
    public async Task<ActionResult<DayOff>> CreateDayOff(DayOff dayOff)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        dbContext.DayOffs.Add(dayOff);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDayOff), new { id = dayOff.Id }, dayOff);
    }

   
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDayOff(int id, DayOff dayOff)
    {
        var existing = await dbContext.DayOffs.FindAsync(id);
        if (existing == null)
            return NotFound(new { message = $"DayOff with ID {id} not found.", Status = 404 });

        existing.Country = dayOff.Country;
        existing.Date = dayOff.Date;
        existing.Name = dayOff.Name;
        existing.Description = dayOff.Description;

        await dbContext.SaveChangesAsync();

        return Ok(new { message = $"DayOff with ID {id} updated successfully.", Status = 200, Data = existing });
    }

  
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDayOff(int id)
    {
        var existing = await dbContext.DayOffs.FindAsync(id);
        if (existing == null)
            return NotFound(new { message = $"DayOff with ID {id} not found.", Status = 404 });

        dbContext.DayOffs.Remove(existing);
        await dbContext.SaveChangesAsync();

        return Ok(new { message = $"DayOff with ID {id} deleted successfully.", Status = 200 });
    }
}
