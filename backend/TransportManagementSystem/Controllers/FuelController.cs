using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FuelController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        public FuelController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        [HttpGet("search")]
        public async Task<IActionResult> GetFuelList([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<Fuel>();

            if (string.IsNullOrEmpty(searchOption.Search))
            {
                pagedData.Data = await dbContext.Fuels.ToListAsync();
            }
            else
            {
                DateTime searchDate;
                bool isDate = DateTime.TryParse(searchOption.Search, out searchDate);

                pagedData.Data = await dbContext.Fuels
                    .Where(x =>

                        (x.Comment != null && x.Comment.Contains(searchOption.Search)) ||
                        (x.FuelTank != null && x.FuelTank.Contains(searchOption.Search)) ||

                        (x.Quantity.HasValue && x.Quantity.Value.ToString().Contains(searchOption.Search)) ||
                        (x.Amount.HasValue && x.Amount.Value.ToString().Contains(searchOption.Search)) ||
                        (isDate && x.FillDate.HasValue && x.FillDate.Value.Date == searchDate.Date)
                    )
                    .ToListAsync();
            }

            pagedData.TotalData = pagedData.Data.Count;

            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                pagedData.Data = pagedData.Data
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value)
                    .ToList();
            }

            return Ok(pagedData);
        }

        
        [HttpGet("ListOfDrivers")]
        public async Task<ActionResult<IEnumerable<Fuel>>> GetFuel()
        {
            return await dbContext.Fuels.ToListAsync();
        }

       
        [HttpGet("{id}")]
        public async Task<ActionResult<Fuel>> GetFuelById(int id)
        {
            var fuel = await dbContext.Fuels.FindAsync(id);

            if (fuel == null)
                return NotFound(new
                {
                    message = $"Fuel with ID {id} was not found in the database.",
                    Status = 404
                });

            return fuel;
        }

       
        [HttpPost]
        public async Task<ActionResult<Fuel>> CreateFuel(Fuel fuel)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dbContext.Fuels.Add(fuel);
            await dbContext.SaveChangesAsync();

            if (fuel.Id == 0)
                return BadRequest("Fuel ID was not generated. Something went wrong.");

            return CreatedAtAction(nameof(GetFuelById), new { id = fuel.Id }, fuel);
        }

        
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFuel(int id, Fuel fuel)
        {
            var existingFuel = await dbContext.Fuels.FindAsync(id);

            
            if (existingFuel == null)
            {
                return NotFound(new
                {
                    message = $"Fuel with ID {id} was not found.",
                    Status = 404
                });
            }

            
            existingFuel.TruckId = fuel.TruckId;
            existingFuel.DriverId = fuel.DriverId;
            existingFuel.FillDate = fuel.FillDate;
            existingFuel.Quantity = fuel.Quantity;
            existingFuel.OdometerReading = fuel.OdometerReading;
            existingFuel.Amount = fuel.Amount;
            existingFuel.Comment = fuel.Comment;
            existingFuel.FuelTank = fuel.FuelTank;
            existingFuel.FuelVendorId = fuel.FuelVendorId;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Fuel with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingFuel
            });
        }

      
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFuel(int id)
        {
            
            var existingFuel = await dbContext.Fuels.FindAsync(id);

            if (existingFuel == null)
            {
                return NotFound(new
                {
                    message = $"Fuel with ID {id} was not found.",
                    Status = 404
                });
            }

          
            dbContext.Fuels.Remove(existingFuel);
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Fuel with ID {id} has been deleted successfully.",
                Status = 200
            });
        }
    }
}