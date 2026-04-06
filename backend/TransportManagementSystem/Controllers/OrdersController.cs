using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IRepository<Order> _orderRepository;
    private readonly ApplicationDbContext _context;

    public OrdersController(
        IRepository<Order> orderRepository,
        ApplicationDbContext context)
    {
        _orderRepository = orderRepository;
        _context = context;
    }
    [HttpGet("PaginationAndSearch")]
    public async Task<IActionResult> GetOrders([FromQuery] SearchOptions searchOptions)
    {
        var query = _context.Orders
          .Include(o => o.Customer)
          .AsQueryable();


        if (!string.IsNullOrWhiteSpace(searchOptions.Search))
        {
            var search = searchOptions.Search.ToLower();
            query = query.Where(o =>
                o.Reference.ToLower().Contains(search) ||
                (o.Type != null && o.Type.ToLower().Contains(search)) ||
                o.Status.ToString().ToLower().Contains(search) ||
                (o.Customer != null &&
                    (
                        (o.Customer.Name != null && o.Customer.Name.ToLower().Contains(search)) ||
                        (o.Customer.Matricule != null && o.Customer.Matricule.ToLower().Contains(search))
                    )
                )
            );
        }

        if (!string.IsNullOrWhiteSpace(searchOptions.Reference))
        {
            var reference = searchOptions.Reference.ToLower();
            query = query.Where(o =>
                o.Reference != null &&
                o.Reference.ToLower().Contains(reference)
            );
        }

        if (!string.IsNullOrWhiteSpace(searchOptions.CustomerName))
        {
            var name = searchOptions.CustomerName.ToLower();
            query = query.Where(o =>
                o.Customer != null &&
                o.Customer.Name != null &&
                o.Customer.Name.ToLower().Contains(name)
            );
        }

        if (searchOptions.DeliveryDateStart.HasValue)
        {
            query = query.Where(o => o.DeliveryDate.HasValue &&
                                     o.DeliveryDate.Value.Date >= searchOptions.DeliveryDateStart.Value.Date);
        }
        if (searchOptions.DeliveryDateEnd.HasValue)
        {
            query = query.Where(o => o.DeliveryDate.HasValue &&
                                     o.DeliveryDate.Value.Date <= searchOptions.DeliveryDateEnd.Value.Date);
        }
        if (searchOptions.Status.HasValue)
        {
            query = query.Where(o => o.Status == searchOptions.Status.Value);
        }
        if (!string.IsNullOrWhiteSpace(searchOptions.SourceSystem))
        {
            query = query.Where(o => o.SourceSystem.ToString() == searchOptions.SourceSystem);
        }

        if (searchOptions.IsLate.HasValue)
        {
            var today = DateTime.Today;

            if (searchOptions.IsLate.Value)
            {
                // En retard
                query = query.Where(o =>
                    o.DeliveryDate.HasValue &&
                    o.DeliveryDate.Value.Date < today 
                );
            }
            else
            {
                // À temps
                query = query.Where(o =>
                    !o.DeliveryDate.HasValue ||
                    o.DeliveryDate.Value.Date >= today 
                );
            }
        }

        var totalCount = await query.CountAsync();

        if (!string.IsNullOrWhiteSpace(searchOptions.SortField))
        {
            bool ascending = string.Equals(searchOptions.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
            query = searchOptions.SortField.ToLower() switch
            {  
                "reference" => ascending ? query.OrderBy(o => o.Reference) : query.OrderByDescending(o => o.Reference),
                "customername" => ascending ? query.OrderBy(o => o.Customer.Name) : query.OrderByDescending(o => o.Customer.Name),
                "weight" => ascending ? query.OrderBy(o => o.Weight) : query.OrderByDescending(o => o.Weight),
                "deliverydate" => ascending ? query.OrderBy(o => o.DeliveryDate) : query.OrderByDescending(o => o.DeliveryDate),
                _ => query.OrderByDescending(o => o.CreatedDate)
            };
        }
        else
        {
            query = query.OrderByDescending(o => o.CreatedDate); // tri par défaut si rien n’est demandé
        }

        // Pagination sans toucher au tri
        if (searchOptions.PageIndex.HasValue && searchOptions.PageSize.HasValue)
        {
            query = query
                .Skip(searchOptions.PageIndex.Value * searchOptions.PageSize.Value)
                .Take(searchOptions.PageSize.Value);
        }

        var orders = await query.ToListAsync();

        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            CustomerName = o.Customer?.Name,
            CustomerMatricule = o.Customer?.Matricule, 
            DeliveryAddress = o.DeliveryAddress,
            Reference = o.Reference,
            Type = o.Type,
            Weight = o.Weight,
            WeightUnit = o.WeightUnit,
            Status = o.Status,
            SourceSystem = o.SourceSystem,
            CreatedDate = o.CreatedDate,
            DeliveryDate = o.DeliveryDate
        }).ToList();

        var result = new PagedData<OrderDto>
        {
            TotalData = totalCount,
            Data = orderDtos
        };

        return Ok(new ApiResponse(true, "Commandes récupérées avec succès", result));
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var query = _orderRepository.Query()
            .AsNoTracking() // ✅ move early
            .Select(o => new OrderDto
            {
                Id = o.Id,
                CustomerId = o.CustomerId,
                CustomerName = o.Customer != null ? o.Customer.Name : null,
                CustomerMatricule = o.Customer != null ? o.Customer.Matricule : null,
                Reference = o.Reference,
                Type = o.Type,
                Weight = o.Weight,
                WeightUnit = o.WeightUnit,
                Status = o.Status,
                SourceSystem = o.SourceSystem, 
                CreatedDate = o.CreatedDate,
                DeliveryDate = o.DeliveryDate
            });

        var data = await query
            .OrderByDescending(o => o.CreatedDate)
            .ToListAsync();

        return Ok(new ApiResponse(true, "Commandes récupérées avec succès", data));
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingOrders()
    {
        var orders = await _orderRepository.Query()
            .Include(o => o.Customer) 
            .Where(o => o.Status == OrderStatus.Pending && !o.Deliveries.Any())
            .OrderByDescending(o => o.Priority)
            .ThenBy(o => o.CreatedDate)
            .ToListAsync();

        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            CustomerName = o.Customer?.Name,
            CustomerMatricule = o.Customer?.Matricule,
            Reference = o.Reference,
            Type = o.Type,
            Weight = o.Weight,
            WeightUnit = o.WeightUnit,
            Status = o.Status,
            CreatedDate = o.CreatedDate,
            DeliveryAddress = o.DeliveryAddress,
            Notes = o.Notes,
            Priority = o.Priority,
            HasDelivery = false
        }).ToList();

        return Ok(new ApiResponse(true, "Commandes en attente récupérées", orderDtos));
    }


    [HttpGet("customer/{customerId}")]
    public async Task<IActionResult> GetOrdersByCustomerId(int customerId)
    {
        var orders = await _orderRepository.Query()
             .Include(o => o.Customer)
            .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Pending)
            .OrderByDescending(o => o.CreatedDate)
            .ToListAsync();

        var orderDtos = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            CustomerId = o.CustomerId,
            Reference = o.Reference,
            Type = o.Type,
            Weight = o.Weight,
            WeightUnit = o.WeightUnit, 
            Status = o.Status,
            CreatedDate = o.CreatedDate,
            DeliveryAddress = o.DeliveryAddress
        }).ToList();

        return Ok(new ApiResponse(true, "Commandes du client récupérées", orderDtos));
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(int id)
    {
        var order = await _orderRepository.Query()
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new ApiResponse(false, $"Commande {id} non trouvée"));

        var orderDetails = new OrderDetailsDto
        {
            Id = order.Id,
            CustomerId = order.CustomerId,
            CustomerName = order.Customer?.Name,
            CustomerMatricule = order.Customer?.Matricule,
            Reference = order.Reference,
            Type = order.Type,
            Weight = order.Weight,
            WeightUnit = order.WeightUnit,
            Status = order.Status,
            CreatedDate = order.CreatedDate,
            DeliveryAddress = order.DeliveryAddress,
            DeliveryDate = order.DeliveryDate,
            Notes = order.Notes,
            Priority = order.Priority
        };

        return Ok(new ApiResponse(true, "Commande récupérée avec succès", orderDetails));
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));
        string reference = model.Reference;
        if (string.IsNullOrWhiteSpace(reference))
        {
            var lastOrder = await _orderRepository.Query()
                .OrderByDescending(o => o.Id)
                .FirstOrDefaultAsync();
            int nextNumber = 1;
            if (lastOrder != null && lastOrder.Reference.StartsWith("ORD"))
            {
                if (int.TryParse(lastOrder.Reference[3..], out var lastNumber))
                    nextNumber = lastNumber + 1;
            }
            reference = $"ORD{nextNumber:D6}";
        }
        var order = new Order
        {
            SourceSystem = DataSource.TMS,
            ExternalId = null,
            CustomerId = model.CustomerId,
            Reference = reference,
            Type = model.Type,
            Weight = model.Weight,
            WeightUnit = string.IsNullOrWhiteSpace(model.WeightUnit) ? "palette" : model.WeightUnit,
            Status = OrderStatus.Pending,
            CreatedDate = DateTime.UtcNow,
            DeliveryAddress = model.DeliveryAddress,
            DeliveryDate = model.DeliveryDate,
            Notes = model.Notes
        };
        await _orderRepository.AddAsync(order);
        await _context.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Commande créée avec succès", new { Id = order.Id }));
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateOrder(int id, [FromBody] UpdateOrderDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiResponse(false, "Données invalides", ModelState));

        var order = await _context.Orders.FindAsync(id);
        if (order == null)
            return NotFound(new ApiResponse(false, $"Commande {id} non trouvée"));

        try
        {

            if (model.CustomerId.HasValue)
            {
                order.CustomerId = model.CustomerId.Value;
            }



            if (!string.IsNullOrWhiteSpace(model.Reference) && model.Reference != order.Reference)
            {
                order.Reference = model.Reference;
            }


            order.Weight = model.Weight;
            order.WeightUnit = model.WeightUnit;
            order.DeliveryAddress = model.DeliveryAddress;
            order.Notes = model.Notes;
            order.Priority = model.Priority;
            order.UpdatedDate = DateTime.UtcNow;
            order.DeliveryDate = model.DeliveryDate;

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse(true, "Commande mise à jour avec succès", new { Id = order.Id }));
        }
        catch (Exception ex)
        {

            return StatusCode(500, new ApiResponse(false, "Erreur lors de la mise à jour", ex.Message));
        }
    }

    [HttpPut("mark-ready")]
    public async Task<IActionResult> MarkOrdersReady([FromBody] UpdateOrdersStatusDto model)
    {
        if (model == null || model.OrderIds == null || !model.OrderIds.Any())
            return BadRequest(new ApiResponse(false, "Aucune commande sélectionnée"));

        var orders = await _context.Orders
            .Where(o =>
                model.OrderIds.Contains(o.Id) &&
                o.Status == OrderStatus.Pending
            )
            .ToListAsync();

        if (!orders.Any())
            return BadRequest(new ApiResponse(false, "Aucune commande en attente sélectionnée"));

        foreach (var order in orders)
        {
            order.Status = OrderStatus.ReadyToLoad;
            order.UpdatedDate = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Commandes mises en état Prête au chargement"));
    }



    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(int id)
    {
        var order = await _context.Orders.FindAsync(id);

        if (order == null)
            return NotFound(new ApiResponse(false, $"Commande {id} non trouvée"));

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Commande supprimée avec succès"));
    }

    [HttpGet("filteredIds")]
    public async Task<IActionResult> GetFilteredOrderIds([FromQuery] SearchOptions searchOptions)
    {
        var query = _orderRepository.Query()
    .Include(o => o.Customer)
    .AsQueryable();


        if (!string.IsNullOrWhiteSpace(searchOptions.Search))
        {
            var search = $"%{searchOptions.Search}%";
            query = query.Where(o =>
                o.Reference.ToLower().Contains(search) ||
                (o.Type != null && o.Type.ToLower().Contains(search)) ||
                o.Status.ToString().ToLower().Contains(search) ||
                (o.Customer != null &&
                    (
                        (o.Customer.Name != null && o.Customer.Name.ToLower().Contains(search)) ||
                        (o.Customer.Matricule != null && o.Customer.Matricule.ToLower().Contains(search))
                    )
                )
            );
        }

        if (searchOptions.DeliveryDateStart.HasValue)
            query = query.Where(o => o.DeliveryDate.HasValue && o.DeliveryDate.Value.Date >= searchOptions.DeliveryDateStart.Value.Date);

        if (searchOptions.DeliveryDateEnd.HasValue)
            query = query.Where(o => o.DeliveryDate.HasValue && o.DeliveryDate.Value.Date <= searchOptions.DeliveryDateEnd.Value.Date);

        if (searchOptions.Status.HasValue &&
       Enum.IsDefined(typeof(OrderStatus), searchOptions.Status.Value))
        
            query = query.Where(o => o.Status == searchOptions.Status.Value);

        if (!string.IsNullOrWhiteSpace(searchOptions.SourceSystem))
            query = query.Where(o => o.SourceSystem.ToString() == searchOptions.SourceSystem);

        if (searchOptions.ZoneId.HasValue)
        {
            query = query.Where(o =>
                o.Customer != null 
            );
        }

        var ids = await query.Select(o => o.Id).ToListAsync();
        return Ok(ids);
    }

}
