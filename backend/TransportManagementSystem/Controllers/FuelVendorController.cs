using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FuelVendorController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        public FuelVendorController(ApplicationDbContext context)
        {
            dbContext = context;
        }

        // Search + Pagination
        [HttpGet("search")]
        public async Task<IActionResult> GetFuelVendorList([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<FuelVendor>();
            IQueryable<FuelVendor> query = dbContext.FuelVendors;
            if (!string.IsNullOrEmpty(searchOption.Search))
            {
                query = query.Where(x =>
                    x.Name != null && x.Name.Contains(searchOption.Search)
                );
            }

            // Total count BEFORE pagination
            pagedData.TotalData = await query.CountAsync();

            // Pagination
            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            pagedData.Data = await query.ToListAsync();

            return Ok(pagedData);
        }

        // GET: api/FuelVendor
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var vendors = await dbContext.FuelVendors.ToListAsync();
            return Ok(vendors);
        }

        // Get By Id
        [HttpGet("{id}")]
        public async Task<ActionResult<FuelVendor>> GetFuelVendorById(int id)
        {
            var fuelVendor = await dbContext.FuelVendors.FindAsync(id);

            if (fuelVendor == null)
                return NotFound(new
                {
                    message = $"Fuel Vendor with ID {id} was not found in the database.",
                    Status = 404
                });

            return fuelVendor;
        }

        //Create
        [HttpPost]
        public async Task<ActionResult<Driver>> CreateFuelVendor(FuelVendor FuelVendor)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dbContext.FuelVendors.Add(FuelVendor);
            await dbContext.SaveChangesAsync();

            if (FuelVendor.Id == 0)
                return BadRequest("Fuel Vendor ID was not generated. Something went wrong.");

            return CreatedAtAction(nameof(GetFuelVendorById), new { id = FuelVendor.Id }, FuelVendor);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFuelVendor(int id, FuelVendor FuelVendor)
        {
            var existingFuelVendor = await dbContext.FuelVendors.FindAsync(id);
            // ID does NOT exist → show message
            if (existingFuelVendor == null)
            {
                return NotFound(new
                {
                    message = $"Fuel Vendor with ID {id} was not found.",
                    Status = 404
                });
            }

            // ID exists → update the driver
            existingFuelVendor.Name = FuelVendor.Name;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Fuel Vendor with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingFuelVendor
            });
        }

        //Delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFuelVendor(int id)
        {
            // Find the fuel vendor by ID
            var existingFuelVendor = await dbContext.FuelVendors.FindAsync(id);

            if (existingFuelVendor == null)
            {
                return NotFound(new
                {
                    message = $"Fuel Vendor with ID {id} was not found.",
                    Status = 404
                });
            }

            // Remove the fuel vendor
            dbContext.FuelVendors.Remove(existingFuelVendor);
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Fuel Vendor with ID {id} has been deleted successfully.",
                Status = 200
            });
        }

    }
}
