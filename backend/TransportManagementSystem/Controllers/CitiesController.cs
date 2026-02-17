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
    public class CitiesController : ControllerBase
    {
        private readonly IRepository<City> cityRepository;
         //Constructor 
        public CitiesController(IRepository<City> cityRepository)
        {
            this.cityRepository = cityRepository;
        }
        [HttpGet("PaginationAndSearch")]
        public async Task<IActionResult> GetCities([FromQuery] SearchOptions searchOption)
        {
            var query = cityRepository.Query().AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchOption.Search))
            {
                query = query.Where(c => c.Name.Contains(searchOption.Search));
            }

            var totalData = await query.CountAsync();

            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            var data = await query.Select(c => new CityDto
            {
                Id = c.Id,
                Name = c.Name,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                ZoneId = c.ZoneId
            }).ToListAsync();

            return Ok(new PagedData<CityDto>
            {
                TotalData = totalData,
                Data = data
            });
        }

        // GET 
        [HttpGet]
        public async Task<IActionResult> GetCities()
        {
            var cities = await cityRepository.Query()
                .Include(c => c.Zone)
                .OrderBy(c => c.Name)
                .Select(c => new CityDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    IsActive = c.IsActive,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    ZoneId = c.ZoneId,
                    ZoneName = c.Zone != null ? c.Zone.Name : null
                })
                .ToListAsync();

            return Ok(new ApiResponse(true, "Villes récupérées", cities));
        }

        // GET 
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCityById(int id)
        {
            var city = await cityRepository.Query()
                .Where(c => c.Id == id)
                .Select(c => new CityDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    IsActive = c.IsActive,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    ZoneId = c.ZoneId
                })
                .FirstOrDefaultAsync();

            if (city == null)
                return NotFound(new ApiResponse(false, $"Ville {id} non trouvée"));

            return Ok(new ApiResponse(true, "Ville récupérée", city));
        }

        // POST
        [HttpPost]
        public async Task<IActionResult> CreateCity([FromBody] CreateCityDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

            var city = new City
            {
                Name = model.Name,
                IsActive = model.IsActive ?? true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ZoneId = model.ZoneId
            };

            await cityRepository.AddAsync(city);
            await cityRepository.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetCityById),
                new { id = city.Id },
                new ApiResponse(true, "Ville créée avec succès", city.Id)
            );
        }

        // PUT
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCity(int id, [FromBody] UpdateCityDto model)
        {
            var city = await cityRepository.Query().FirstOrDefaultAsync(c => c.Id == id);

            if (city == null)
                return NotFound(new ApiResponse(false, $"Ville {id} non trouvée"));

            if (!string.IsNullOrWhiteSpace(model.Name))
                city.Name = model.Name;

            if (model.IsActive.HasValue)
                city.IsActive = model.IsActive.Value;

            if (model.ZoneId.HasValue)
                city.ZoneId = model.ZoneId.Value;

            city.UpdatedAt = DateTime.UtcNow;

            cityRepository.Update(city);
            await cityRepository.SaveChangesAsync();

            return Ok(new ApiResponse(true, "Ville mise à jour avec succès"));
        }

        // DELETE
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCity(int id)
        {
            var city = await cityRepository.Query().FirstOrDefaultAsync(c => c.Id == id);

            if (city == null)
                return NotFound(new ApiResponse(false, $"Ville {id} non trouvée"));

            await cityRepository.DeleteAsync(id);
            await cityRepository.SaveChangesAsync();

            return Ok(new ApiResponse(true, "Ville supprimée avec succès"));
        }

        
        [HttpGet("zone/{zoneId}")]
        public async Task<IActionResult> GetCitiesByZone(int zoneId, [FromQuery] bool activeOnly = true)
        {
            var query = cityRepository.Query()
                 .Include(c => c.Zone)
                 .Where(c => c.ZoneId == zoneId && c.IsActive == true);

            if (activeOnly)
            {
                query = query.Where(c => c.IsActive == true);
            }

            var cities = await query
                .OrderBy(c => c.Name)
                .Select(c => new CityDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    IsActive = c.IsActive,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    ZoneId = c.ZoneId
                })
                .ToListAsync();

            return Ok(new ApiResponse(true, "Villes récupérées", cities));
        }
    }
}
