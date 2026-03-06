using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TypeTruckController : ControllerBase
{
    private readonly IRepository<TypeTruck> typeTruckRepository;

    public TypeTruckController(IRepository<TypeTruck> typeTruckRepository)
    {
        this.typeTruckRepository = typeTruckRepository;
    }

    // GET
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] SearchOptions searchOption)
    {
        var pagedData = new PagedData<TypeTruck>();

        if (string.IsNullOrEmpty(searchOption.Search))
        {
            pagedData.Data = await typeTruckRepository.GetAll();
        }
        else
        {
            pagedData.Data = await typeTruckRepository.GetAll(
                x => x.Type.Contains(searchOption.Search)
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

    // GET by ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTypeTruckById(int id)
    {
        var typeTruck = await typeTruckRepository.FindByIdAsync(id);
        if (typeTruck == null)
        {
            return NotFound();
        }
        return Ok(typeTruck);
    }

    // CREATE
    [HttpPost]
    public async Task<IActionResult> AddTypeTruck([FromBody] TypeTruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var typeTruck = new TypeTruck
        {
            Type = model.Type,
            Capacity = model.Capacity,
          
        };

        await typeTruckRepository.AddAsync(typeTruck);
        await typeTruckRepository.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTypeTruckById), new { id = typeTruck.Id }, typeTruck);
    }

    // UPDATE
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTypeTruck(int id, [FromBody] TypeTruckDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var typeTruck = await typeTruckRepository.FindByIdAsync(id);
        if (typeTruck == null)
            return NotFound();

        typeTruck.Type = model.Type;
        typeTruck.Capacity = model.Capacity;


        typeTruckRepository.Update(typeTruck);
        await typeTruckRepository.SaveChangesAsync();

        return Ok(typeTruck);
    }

    // DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTypeTruck(int id)
    {
        var typeTruck = await typeTruckRepository.FindByIdAsync(id);
        if (typeTruck == null)
            return NotFound();

        await typeTruckRepository.DeleteAsync(id);
        await typeTruckRepository.SaveChangesAsync();

        return Ok(new { message = "Le type de Truck a été supprimé avec succès" });
    }
    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<TypeTruck>>> GetTypeTrucksList()
    {
        var TypeTrucks = await typeTruckRepository.GetAll();
        return Ok(TypeTrucks);
    }
}
