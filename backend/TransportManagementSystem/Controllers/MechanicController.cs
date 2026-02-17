
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MechanicController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;

        public MechanicController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        [HttpGet("Pagination and Search")]
        public async Task<IActionResult> GetMechanicList([FromQuery] SearchOptions searchOption)
        {
            var query = dbContext.Mechanics.AsQueryable();

           
            if (!string.IsNullOrEmpty(searchOption.Search))
            {
                query = query.Where(x =>
                    (x.Name != null && x.Name.Contains(searchOption.Search)) ||
                    (x.Email != null && x.Email.Contains(searchOption.Search)) ||
                    (x.Phone != null && x.Phone.Contains(searchOption.Search))
                );
            }

            var totalData = await query.CountAsync();

            
            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            var pagedData = new PagedData<Mechanic>
            {
                Data = await query.ToListAsync(),
                TotalData = totalData
            };

            return Ok(pagedData);
        }

        
        [HttpGet("{id}")]
        public async Task<ActionResult<Mechanic>> GetMechanicById(int id)
        {
            var mechanics = await dbContext.Mechanics.FindAsync(id);

            if (mechanics == null)
                return NotFound(new
                {
                    message = $"Mechanic with ID {id} was not found in the database.",
                    Status = 404

                });
            return mechanics;
        }

       
        [HttpPost]
        public async Task<ActionResult<Mechanic>> CreateMechanic(Mechanic mechanic)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dbContext.Mechanics.Add(mechanic);
            await dbContext.SaveChangesAsync();

            if (mechanic.Id == 0)
                return BadRequest("Mechanic ID was not generated. Something went wrong.");

            return CreatedAtAction(nameof(GetMechanicById), new { id = mechanic.Id }, mechanic);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMechanic(int id, Mechanic mechanic)
        {
            var existingMechanic = await dbContext.Mechanics.FindAsync(id);
            
            if (existingMechanic == null)
            {
                return NotFound(new
                {
                    message = $"Mechanic with ID {id} was not found.",
                    Status = 404
                });
            }

           
            existingMechanic.Name = mechanic.Name;
            existingMechanic.Email = mechanic.Email;
            existingMechanic.Phone = mechanic.Phone;
            existingMechanic.CreatedDate = mechanic.CreatedDate;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Mechanic with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingMechanic
            });
        }

        
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMechanic(int id)
        {
            
            var existingMechanic = await dbContext.Mechanics.FindAsync(id);

            if (existingMechanic == null)
            {
                return NotFound(new
                {
                    message = $"Mechanic with ID {id} was not found.",
                    Status = 404
                });
            }

           
            dbContext.Mechanics.Remove(existingMechanic);
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Mechanic with ID {id} has been deleted successfully.",
                Status = 200
            });
        }


        [HttpGet("all")]
        public async Task<ActionResult<IEnumerable<Mechanic>>> GetMechanics()
        {
            return await dbContext.Mechanics.ToListAsync();
        }
    }
}
