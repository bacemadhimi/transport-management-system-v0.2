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
public class StorageLocationController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public StorageLocationController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("bywarehouse")]
    public async Task<IActionResult> GetStorageLocationsByWarehouse([FromQuery] StorageLocationSearchOptions searchOptions)
    {
        // Requête LINQ avec toutes les jointures nécessaires
        var query = from w in _context.PMMWarehouse
                    join cw in _context.CPDataX on w.DataXLink equals cw.Key
                    join sl in _context.tblPMMStorageLocation on w.Key equals sl.WarehouseLink
                    join pu in _context.tblItpProcessUnit on sl.ProcessUnitLink equals pu.Key into puJoin
                    from pu in puJoin.DefaultIfEmpty()
                    join cpu in _context.CPDataX on pu.DataXLink equals cpu.Key into cpuJoin
                    from cpu in cpuJoin.DefaultIfEmpty()
                    join q in _context.tblPMMQuant on sl.Key equals q.StorageLocationLink into qJoin
                    from q in qJoin.Where(x => x.IsCanceled == false && x.IsSpent == false).DefaultIfEmpty()
                    join m in _context.tblPMMMaterial on q.MaterialLink equals m.Key into mJoin
                    from m in mJoin.DefaultIfEmpty()
                    join mc in _context.tblPMMMaterialClass on m.MaterialClassLink equals mc.Key into mcJoin
                    from mc in mcJoin.DefaultIfEmpty()
                    join mg in _context.tblPMMMaterialGroup on m.GroupLink equals mg.Key into mgJoin
                    from mg in mgJoin.DefaultIfEmpty()
                    join lt in _context.tblIdcLanguageText on m.TextLink equals lt.Key into ltJoin
                    from lt in ltJoin.DefaultIfEmpty()
                    join lang in _context.tblIdcLanguage on lt.LanguageId equals lang.Key into langJoin
                    from lang in langJoin.Where(l => l.IsDefault).DefaultIfEmpty()
                    where w.Key == searchOptions.WarehouseKey
                    select new StorageLocationDetailDTO
                    {
                        // Informations du dépôt
                        DepotName = cw.Name,
                        DepotDescription = cw.Description,
                        DepotKey = w.Key,

                        // Informations du lieu de stockage
                        LieuStockageNom = cpu != null ? cpu.Name : null,
                        LieuStockageDescription = cpu != null ? cpu.Description : null,
                        LieuStockageKey = sl.Key,
                        Capacite = sl.Capacity,
                        Volume = sl.Volume,

                        // Informations du matériau
                        MateriauKey = m != null ? m.Key : (int?)null,
                        MateriauDesignation = m != null ? m.Name : null,
                        ClasseMateriau = mc != null ? mc.Name : null,
                        GroupeMateriau = mg != null ? mg.Name : null,
                        DescriptionMateriau = lt != null ? lt.Text : null,
                        Densite = m != null ? m.Density : (double?)null,

                        // Quantités et stocks
                        StockTotal = q != null ? q.TotalQuantity : 0,
                        StockDisponible = q != null ? q.FreeQuantity : 0,
                        StockBloque = q != null ? q.LockedQuantity : 0,
                        StockReserve = q != null ? q.ReservedQuantity : 0,

                        // Dates
                        DateLimiteConsommation = q != null && q.Expiration > 0
                            ? DateTimeOffset.FromUnixTimeSeconds(q.Expiration).DateTime
                            : (DateTime?)null,

                        // Informations du lot
                        NumLotFournisseur = q != null ? q.SupplierBatchNumber : null,
                        NumMaterielApproche = q != null ? q.ApproachMaterialNumber : null,
                        StatutQuant = q != null ? (q.IsCanceled ? "Annulé" : "Actif") : null,
                        BlocageExpiration = q != null ? (q.LockedByExpiration ? "Bloqué par expiration" : "Non bloqué") : null,
                        EstConsomme = q != null ? (q.IsSpent ? "Consommé" : "Non consommé") : null
                    };

        // Application des filtres
        if (!string.IsNullOrWhiteSpace(searchOptions.Search))
        {
            var search = searchOptions.Search.ToLower();
            query = query.Where(r =>
                (r.LieuStockageNom != null && r.LieuStockageNom.ToLower().Contains(search)) ||
                (r.LieuStockageDescription != null && r.LieuStockageDescription.ToLower().Contains(search))
            );
        }

        if (!string.IsNullOrWhiteSpace(searchOptions.MaterialSearch))
        {
            var materialSearch = searchOptions.MaterialSearch.ToLower();
            query = query.Where(r =>
                r.MateriauDesignation != null && r.MateriauDesignation.ToLower().Contains(materialSearch)
            );
        }

        // Groupement par lieu de stockage et matériau
        var groupedQuery = query.GroupBy(r => new { r.LieuStockageKey, r.MateriauKey })
            .Select(g => new StorageLocationDetailDTO
            {
                DepotName = g.First().DepotName,
                DepotDescription = g.First().DepotDescription,
                DepotKey = g.First().DepotKey,
                LieuStockageNom = g.First().LieuStockageNom,
                LieuStockageDescription = g.First().LieuStockageDescription,
                LieuStockageKey = g.Key.LieuStockageKey,
                Capacite = g.First().Capacite,
                Volume = g.First().Volume,
                MateriauKey = g.Key.MateriauKey,
                MateriauDesignation = g.First().MateriauDesignation,
                ClasseMateriau = g.First().ClasseMateriau,
                GroupeMateriau = g.First().GroupeMateriau,
                DescriptionMateriau = g.First().DescriptionMateriau,
                Densite = g.First().Densite,
                StockTotal = g.Sum(x => x.StockTotal),
                StockDisponible = g.Sum(x => x.StockDisponible),
                StockBloque = g.Sum(x => x.StockBloque),
                StockReserve = g.Sum(x => x.StockReserve),
                DateLimiteConsommation = g.First().DateLimiteConsommation,
                NumLotFournisseur = g.First().NumLotFournisseur,
                NumMaterielApproche = g.First().NumMaterielApproche,
                StatutQuant = g.First().StatutQuant,
                BlocageExpiration = g.First().BlocageExpiration,
                EstConsomme = g.First().EstConsomme
            });

        var totalCount = await groupedQuery.CountAsync();

        // Tri
        if (!string.IsNullOrWhiteSpace(searchOptions.SortField))
        {
            bool ascending = string.Equals(searchOptions.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
            groupedQuery = searchOptions.SortField.ToLower() switch
            {
                "lieustockagenom" => ascending
                    ? groupedQuery.OrderBy(r => r.LieuStockageNom)
                    : groupedQuery.OrderByDescending(r => r.LieuStockageNom),
                "materiaudesignation" => ascending
                    ? groupedQuery.OrderBy(r => r.MateriauDesignation)
                    : groupedQuery.OrderByDescending(r => r.MateriauDesignation),
                "stocktotal" => ascending
                    ? groupedQuery.OrderBy(r => r.StockTotal)
                    : groupedQuery.OrderByDescending(r => r.StockTotal),
                "stockdisponible" => ascending
                    ? groupedQuery.OrderBy(r => r.StockDisponible)
                    : groupedQuery.OrderByDescending(r => r.StockDisponible),
                "datelimiteconsommation" => ascending
                    ? groupedQuery.OrderBy(r => r.DateLimiteConsommation)
                    : groupedQuery.OrderByDescending(r => r.DateLimiteConsommation),
                "capacite" => ascending
                    ? groupedQuery.OrderBy(r => r.Capacite)
                    : groupedQuery.OrderByDescending(r => r.Capacite),
                "volume" => ascending
                    ? groupedQuery.OrderBy(r => r.Volume)
                    : groupedQuery.OrderByDescending(r => r.Volume),
                _ => groupedQuery.OrderBy(r => r.LieuStockageNom)
            };
        }
        else
        {
            groupedQuery = groupedQuery.OrderBy(r => r.LieuStockageNom);
        }

        // Pagination
        if (searchOptions.PageIndex.HasValue && searchOptions.PageSize.HasValue)
        {
            groupedQuery = groupedQuery
                .Skip(searchOptions.PageIndex.Value * searchOptions.PageSize.Value)
                .Take(searchOptions.PageSize.Value);
        }

        var result = await groupedQuery.ToListAsync();

        return Ok(new ApiResponse(true, "Lieux de stockage récupérés avec succès", new PagedData<StorageLocationDetailDTO>
        {
            TotalData = totalCount,
            Data = result
        }));
    }

    [HttpGet("warehouse/{id}")]
    public async Task<IActionResult> GetWarehouseInfo(int id)
    {
        var warehouse = await (from w in _context.PMMWarehouse
                               join c in _context.CPDataX on w.DataXLink equals c.Key
                               where w.Key == id
                               select new
                               {
                                   warehouseKey = w.Key,
                                   warehouseName = c.Name,
                                   warehouseDescription = c.Description
                               }).FirstOrDefaultAsync();

        if (warehouse == null)
            return NotFound(new ApiResponse(false, "Dépôt non trouvé"));

        return Ok(new ApiResponse(true, "Info dépôt récupérées", warehouse));
    }
}