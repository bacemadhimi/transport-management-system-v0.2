using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MarqueTruckController : ControllerBase
    {
        private readonly IRepository<MarqueTruck> marqueTruckRepository;

        public MarqueTruckController(IRepository<MarqueTruck> marqueTruckRepository)
        {
            this.marqueTruckRepository = marqueTruckRepository ;
        }

        //Get
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] SearchOptions searchOption)
        {
            var pagedData = new PagedData<MarqueTruck>();

            if (string.IsNullOrEmpty(searchOption.Search))
            {
                pagedData.Data = await marqueTruckRepository.GetAll();
            }
            else
            {
                pagedData.Data = await marqueTruckRepository.GetAll(
                    x => x.Name.Contains(searchOption.Search)
                );
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
        //GET
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMarqueTruckById(int id)
        {
            var marqueTruck = await marqueTruckRepository.FindByIdAsync(id);
            if (marqueTruck == null)
            {
                return NotFound();
            }
            return Ok(marqueTruck);
        }
        //CREATE
        [HttpPost]
        public async Task<IActionResult> AddMarqueTruck([FromBody] MarqueTruckDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existingMarque = (await marqueTruckRepository
                .GetAll(x => x.Name == model.Name))
                .FirstOrDefault();

            if (existingMarque != null)
                return BadRequest("Cette marque existe déjà");

            var marqueTruck = new MarqueTruck
            {
                Name = model.Name
            };

            await marqueTruckRepository.AddAsync(marqueTruck);
            await marqueTruckRepository.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMarqueTruckById),
                new { id = marqueTruck.Id }, marqueTruck);
        }
        //UPDATE
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMarqueTruck(int id, [FromBody] MarqueTruckDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var marqueTruck = await marqueTruckRepository.FindByIdAsync(id);
            if (marqueTruck == null)
                return NotFound();

            var existingMarque = (await marqueTruckRepository.GetAll(x =>
                x.Name == model.Name && x.Id != id))
                .FirstOrDefault();

            if (existingMarque != null)
                return BadRequest("Cette marque existe déjà");

            marqueTruck.Name = model.Name;

            marqueTruckRepository.Update(marqueTruck);
            await marqueTruckRepository.SaveChangesAsync();

            return Ok(marqueTruck);
        }
        //DELETE
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMarqueTruck(int id)
        {
            var marqueTruck = await marqueTruckRepository.FindByIdAsync(id);
            if (marqueTruck == null)
                return NotFound();

            await marqueTruckRepository.DeleteAsync(id);
            await marqueTruckRepository.SaveChangesAsync();

            return Ok(new { message = "La marque a été supprimée avec succès" });
        }

    }
}
