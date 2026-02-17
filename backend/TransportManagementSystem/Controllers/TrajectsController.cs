using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TrajectController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public TrajectController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }
    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetTrajectList([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<Traject>();

       
        var query = _dbContext.Trajects.Include(t => t.Points).AsQueryable();

        
        if (!string.IsNullOrEmpty(searchOption.Search))
        {
            query = query.Where(t => t.Name.Contains(searchOption.Search));
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

  
    [HttpGet("ListOfTrajects")]
    public async Task<ActionResult<IEnumerable<Traject>>> GetTrajects()
    {
        return await _dbContext.Trajects.Include(t => t.Points).ToListAsync();
    }

  
    [HttpGet("{id}")]
    public async Task<ActionResult<Traject>> GetTrajectById(int id)
    {
        var traject = await _dbContext.Trajects
            .Include(t => t.Points)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (traject == null)
            return NotFound(new { message = $"Traject with ID {id} not found.", Status = 404 });

        return traject;
    }

   
    [HttpPost]
    public async Task<ActionResult<Traject>> CreateTraject(Traject traject)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _dbContext.Trajects.Add(traject);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTrajectById), new { id = traject.Id }, traject);
    }

  
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTraject(int id, Traject updatedTraject)
    {
        var existingTraject = await _dbContext.Trajects
            .Include(t => t.Points)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (existingTraject == null)
            return NotFound(new { message = $"Traject with ID {id} not found.", Status = 404 });

        existingTraject.Name = updatedTraject.Name;
        existingTraject.StartLocationId = updatedTraject.StartLocationId;
        existingTraject.EndLocationId = updatedTraject.EndLocationId;
        existingTraject.IsPredefined = updatedTraject.IsPredefined;



        _dbContext.TrajectPoints.RemoveRange(existingTraject.Points);
        existingTraject.Points = updatedTraject.Points;

        await _dbContext.SaveChangesAsync();

        return Ok(new { message = $"Traject with ID {id} updated successfully.", Status = 200, Data = existingTraject });
    }

    
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTraject(int id)
    {
        var traject = await _dbContext.Trajects
            .Include(t => t.Points)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (traject == null)
            return NotFound(new { message = $"Traject with ID {id} not found.", Status = 404 });

        _dbContext.TrajectPoints.RemoveRange(traject.Points);
        _dbContext.Trajects.Remove(traject);
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = $"Traject with ID {id} deleted successfully.", Status = 200 });
    }

    [HttpGet("trips/{tripId}/traject")]
    public async Task<IActionResult> GetTrajectForTrip(int tripId)
    {
        try
        {
           
            var trip = await _dbContext.Trips
                .Include(t => t.Traject)
                .FirstOrDefaultAsync(t => t.Id == tripId);

            if (trip == null)
                return NotFound(new { message = "Trip not found" });

            if (trip.Traject == null)
                return Ok(null);

            return Ok(new { data = trip.Traject });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error" });
        }
    }
}
