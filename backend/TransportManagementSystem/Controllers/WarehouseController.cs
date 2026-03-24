using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Entity.PlantIt;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehouseController : ControllerBase
{
    private readonly IRepository<Warehouse> _warehouseRepository;
    private readonly ApplicationDbContext _context;

    public WarehouseController(IRepository<Warehouse> warehouseRepository, ApplicationDbContext context)
    {
        _warehouseRepository = warehouseRepository;
        _context = context;
    }

    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetWarehouses([FromQuery] WarehouseSearchOptions searchOptions)
    {
        var query = _context.Warehouses.Include(w => w.Zones).AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchOptions.Search))
        {
            var search = searchOptions.Search.ToLower();
            query = query.Where(w =>
                w.Code.ToLower().Contains(search) ||
                w.Name.ToLower().Contains(search)
            );
        }

        if (searchOptions.Type.HasValue)
        {
            query = query.Where(w => w.Type == searchOptions.Type.Value);
        }

        var totalCount = await query.CountAsync();

        // Tri
        if (!string.IsNullOrWhiteSpace(searchOptions.SortField))
        {
            bool ascending = string.Equals(searchOptions.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
            query = searchOptions.SortField.ToLower() switch
            {
                "code" => ascending ? query.OrderBy(w => w.Code) : query.OrderByDescending(w => w.Code),
                "name" => ascending ? query.OrderBy(w => w.Name) : query.OrderByDescending(w => w.Name),
                "type" => ascending ? query.OrderBy(w => w.Type) : query.OrderByDescending(w => w.Type),
                _ => query.OrderByDescending(w => w.Id)
            };
        }
        else
        {
            query = query.OrderByDescending(w => w.Id);
        }

        // Pagination
        if (searchOptions.PageIndex.HasValue && searchOptions.PageSize.HasValue)
        {
            query = query
                .Skip(searchOptions.PageIndex.Value * searchOptions.PageSize.Value)
                .Take(searchOptions.PageSize.Value);
        }

        var warehouses = await query.ToListAsync();

        var result = warehouses.Select(w => new WarehouseDTO
        {
            Id = w.Id,
            Code = w.Code,
            Name = w.Name,
            Type = w.Type,
            Zones = w.Zones.Select(z => new ZoneDTO
            {
                Id = z.Id,
                Code = z.Code,
                Name = z.Name,
                ZoneType = z.ZoneType
            }).ToList()
        }).ToList();

        return Ok(new ApiResponse(true, "Dépôts récupérés avec succès", new PagedData<WarehouseDTO>
        {
            TotalData = totalCount,
            Data = result
        }));
    }
}