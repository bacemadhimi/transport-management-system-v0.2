using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity.PlantIt;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehouseController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public WarehouseController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetWarehouses([FromQuery] WarehouseSearchOptions searchOptions)
    {
        // Jointure entre tblPMMWarehouse et tblCPDataX
        var query = from w in _context.PMMWarehouse
                    join c in _context.CPDataX on w.DataXLink equals c.Key
                    select new WarehousePlantItDTO
                    {
                        // Données de tblPMMWarehouse
                        Key = w.Key,
                        DataXLink = w.DataXLink,
                        LastModified = w.LastModified,
                        ProcessUnitClassLink = w.ProcessUnitClassLink,
                        PipeCount = w.PipeCount,
                        SupportMultipleDocking = w.SupportMultipleDocking,
                        ContainerParallelUsageMode = w.ContainerParallelUsageMode,

                        // Données de tblCPDataX
                        WarehouseCode = c.Name,
                        WarehouseName = c.Description,
                        IsActivated = c.Activated,
                        UidKey = c.UidKey,
                        ParentLink = c.ParentLink,
                        StructureLink = c.StructureLink
                    };

        // Filtre par recherche
        if (!string.IsNullOrWhiteSpace(searchOptions.Search))
        {
            var search = searchOptions.Search.ToLower();
            query = query.Where(w =>
                w.WarehouseCode.ToLower().Contains(search) ||
                w.WarehouseName.ToLower().Contains(search)
            );
        }

        // Filtre par statut
        if (searchOptions.Status.HasValue)
        {
            query = query.Where(w => w.IsActivated == searchOptions.Status.Value);
        }

        // Filtre par ProcessUnitClassLink
        if (searchOptions.ProcessUnitClassLink.HasValue)
        {
            query = query.Where(w => w.ProcessUnitClassLink == searchOptions.ProcessUnitClassLink.Value);
        }

        var totalCount = await query.CountAsync();

        // Tri
        if (!string.IsNullOrWhiteSpace(searchOptions.SortField))
        {
            bool ascending = string.Equals(searchOptions.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
            query = searchOptions.SortField.ToLower() switch
            {
                "code" => ascending ? query.OrderBy(w => w.WarehouseCode) : query.OrderByDescending(w => w.WarehouseCode),
                "name" => ascending ? query.OrderBy(w => w.WarehouseName) : query.OrderByDescending(w => w.WarehouseName),
                "pipecount" => ascending ? query.OrderBy(w => w.PipeCount) : query.OrderByDescending(w => w.PipeCount),
                "lastmodified" => ascending ? query.OrderBy(w => w.LastModified) : query.OrderByDescending(w => w.LastModified),
                _ => query.OrderByDescending(w => w.Key)
            };
        }
        else
        {
            query = query.OrderByDescending(w => w.Key);
        }

        // Pagination
        if (searchOptions.PageIndex.HasValue && searchOptions.PageSize.HasValue)
        {
            query = query
                .Skip(searchOptions.PageIndex.Value * searchOptions.PageSize.Value)
                .Take(searchOptions.PageSize.Value);
        }

        var warehouses = await query.ToListAsync();

        return Ok(new ApiResponse(true, "Entrepôts récupérés avec succès", new PagedData<WarehousePlantItDTO>
        {
            TotalData = totalCount,
            Data = warehouses
        }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetWarehouseById(int id)
    {
        var warehouse = await (from w in _context.PMMWarehouse
                               join c in _context.CPDataX on w.DataXLink equals c.Key
                               where w.Key == id
                               select new WarehousePlantItDTO
                               {
                                   Key = w.Key,
                                   DataXLink = w.DataXLink,
                                   LastModified = w.LastModified,
                                   ProcessUnitClassLink = w.ProcessUnitClassLink,
                                   PipeCount = w.PipeCount,
                                   SupportMultipleDocking = w.SupportMultipleDocking,
                                   ContainerParallelUsageMode = w.ContainerParallelUsageMode,
                                   WarehouseCode = c.Name,
                                   WarehouseName = c.Description,
                                   IsActivated = c.Activated,
                                   UidKey = c.UidKey,
                                   ParentLink = c.ParentLink,
                                   StructureLink = c.StructureLink
                               }).FirstOrDefaultAsync();

        if (warehouse == null)
            return NotFound(new ApiResponse(false, "Entrepôt non trouvé"));

        return Ok(new ApiResponse(true, "Entrepôt récupéré avec succès", warehouse));
    }
}