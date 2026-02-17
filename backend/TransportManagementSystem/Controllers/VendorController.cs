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
    public class VendorController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        public VendorController(ApplicationDbContext context)
        {
            dbContext= context;
        }

        [HttpGet("Pagination and Search")]
        public async Task<IActionResult> GetVendorList([FromQuery] SearchOptions searchOption)
        {
            var query = dbContext.Vendors.AsQueryable();
           
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
            var pagedData = new PagedData<Vendor>
            {
                Data = await query.ToListAsync(),
                TotalData = totalData
            };
            return Ok(pagedData);
        }


     
        [HttpGet("{id}")]
        public async Task<ActionResult<Vendor>> GetVendorById(int id)
        {
            var vendors = await dbContext.Vendors.FindAsync(id);

            if (vendors == null)
                return NotFound(new
                {
                    message = $"Vendor with ID {id} was not found in the database.",
                    Status = 404

                });
            return vendors;
        }

      
        [HttpPost]
        public async Task<ActionResult<Mechanic>> CreateVendor(Vendor vendor)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            dbContext.Vendors.Add(vendor);
            await dbContext.SaveChangesAsync();

            if (vendor.Id == 0)
                return BadRequest("Vendor ID was not generated. Something went wrong.");

            return CreatedAtAction(nameof(GetVendorById), new { id = vendor.Id }, vendor);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVendor(int id, Vendor vendor)
        {
            var existingVendor = await dbContext.Vendors.FindAsync(id);
            
            if (existingVendor == null)
            {
                return NotFound(new
                {
                    message = $"Vendor with ID {id} was not found.",
                    Status = 404
                });
            }

            
            existingVendor.Name = vendor.Name;
            existingVendor.Email = vendor.Email;
            existingVendor.Phone = vendor.Phone;
            existingVendor.CreatedDate = vendor.CreatedDate;

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Vendor with ID {id} has been updated successfully.",
                Status = 200,
                Data = existingVendor
            });
        }

        
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVendor(int id)
        {
            
            var existingVendor = await dbContext.Vendors.FindAsync(id);

            if (existingVendor == null)
            {
                return NotFound(new
                {
                    message = $"Vendor with ID {id} was not found.",
                    Status = 404
                });
            }

            
            dbContext.Vendors.Remove(existingVendor);
            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Vendor with ID {id} has been deleted successfully.",
                Status = 200
            });
        }
        [HttpGet("All")]
        public async Task<ActionResult<IEnumerable<Vendor>>> GetVendor()
        {
            return await dbContext.Vendors.ToListAsync();
        }

    }
}
