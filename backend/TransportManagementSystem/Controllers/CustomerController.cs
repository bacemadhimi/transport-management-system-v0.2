using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CustomerController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;
        private readonly IRepository<Customer> customerRepository;

        public CustomerController(ApplicationDbContext context, IRepository<Customer> customerRepository)
        {
            this.customerRepository = customerRepository;
            dbContext = context;
        }

        [HttpGet("PaginationAndSearch")]
        public async Task<IActionResult> GetCustomerList([FromQuery] SearchOptions searchOption)
        {
            var query = dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchOption.Search))
            {
                var search = searchOption.Search.ToLower();

                query = query.Where(c =>
                    c.Name.ToLower().Contains(search) ||
                    c.Phone.ToLower().Contains(search) ||
                    c.Email.ToLower().Contains(search)
                );
            }

            if (!string.IsNullOrWhiteSpace(searchOption.SourceSystem))
            {
                if (Enum.TryParse<DataSource>(searchOption.SourceSystem, true, out var source))
                {
                    query = query.Where(c => c.SourceSystem == source);
                }
            }

            var totalData = await query.CountAsync();

            if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
            {
                query = query
                    .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                    .Take(searchOption.PageSize.Value);
            }

            var customers = await query.ToListAsync();

            var customerDtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                Phone = c.Phone,
                PhoneCountry = c.PhoneCountry,
                Email = c.Email,
                Matricule = c.Matricule,
                Contact = c.Contact,
                Address = c.Address,
                Latitude = c.Latitude,
                Longitude = c.Longitude,
                SourceSystem = c.SourceSystem.ToString(),
                GeographicalEntities = c.CustomerGeographicalEntities?
                    .Where(cg => cg.GeographicalEntity != null && cg.GeographicalEntity.IsActive)
                    .Select(cg => new CustomerGeographicalEntityDto
                    {
                        GeographicalEntityId = cg.GeographicalEntityId,
                        GeographicalEntityName = cg.GeographicalEntity.Name,
                        LevelName = cg.GeographicalEntity.Level?.Name,
                        LevelNumber = cg.GeographicalEntity.Level?.LevelNumber ?? 0,
                        Latitude = cg.GeographicalEntity.Latitude.HasValue ? (double?)cg.GeographicalEntity.Latitude.Value : null,
                        Longitude = cg.GeographicalEntity.Longitude.HasValue ? (double?)cg.GeographicalEntity.Longitude.Value : null
                    }).ToList() ?? new List<CustomerGeographicalEntityDto>()
            }).ToList();

            return Ok(new PagedData<CustomerDto>
            {
                TotalData = totalData,
                Data = customerDtos
            });
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers()
        {
            var customers = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .ToListAsync();

            var customerDtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                Phone = c.Phone,
                PhoneCountry = c.PhoneCountry,
                Email = c.Email,
                Matricule = c.Matricule,
                Contact = c.Contact,
                Address = c.Address,
                Latitude = c.Latitude,
                Longitude = c.Longitude,
                SourceSystem = c.SourceSystem.ToString(),
                GeographicalEntities = c.CustomerGeographicalEntities?
                    .Where(cg => cg.GeographicalEntity != null && cg.GeographicalEntity.IsActive)
                    .Select(cg => new CustomerGeographicalEntityDto
                    {
                        GeographicalEntityId = cg.GeographicalEntityId,
                        GeographicalEntityName = cg.GeographicalEntity.Name,
                        LevelName = cg.GeographicalEntity.Level?.Name,
                        LevelNumber = cg.GeographicalEntity.Level?.LevelNumber ?? 0,
                        Latitude = cg.GeographicalEntity.Latitude.HasValue ? (double?)cg.GeographicalEntity.Latitude.Value : null,
                        Longitude = cg.GeographicalEntity.Longitude.HasValue ? (double?)cg.GeographicalEntity.Longitude.Value : null
                    }).ToList() ?? new List<CustomerGeographicalEntityDto>()
            }).ToList();

            return Ok(customerDtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerDto>> GetCustomerById(int id)
        {
            var customer = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null)
                return NotFound(new { message = $"Customer with ID {id} not found" });

            var customerDto = new CustomerDto
            {
                Id = customer.Id,
                Name = customer.Name,
                Phone = customer.Phone,
                PhoneCountry = customer.PhoneCountry,
                Email = customer.Email,
                Matricule = customer.Matricule,
                Contact = customer.Contact,
                Address = customer.Address,
                Latitude = customer.Latitude,
                Longitude = customer.Longitude,
                SourceSystem = customer.SourceSystem.ToString(),
                GeographicalEntities = customer.CustomerGeographicalEntities?
                    .Where(cg => cg.GeographicalEntity != null && cg.GeographicalEntity.IsActive)
                    .Select(cg => new CustomerGeographicalEntityDto
                    {
                        GeographicalEntityId = cg.GeographicalEntityId,
                        GeographicalEntityName = cg.GeographicalEntity.Name,
                        LevelName = cg.GeographicalEntity.Level?.Name,
                        LevelNumber = cg.GeographicalEntity.Level?.LevelNumber ?? 0,
                        Latitude = cg.GeographicalEntity.Latitude.HasValue ? (double?)cg.GeographicalEntity.Latitude.Value : null,
                        Longitude = cg.GeographicalEntity.Longitude.HasValue ? (double?)cg.GeographicalEntity.Longitude.Value : null
                    }).ToList() ?? new List<CustomerGeographicalEntityDto>()
            };

            return Ok(new ApiResponse(true, "Customer retrieved successfully", customerDto));
        }

        [HttpPost]
        public async Task<ActionResult> CreateCustomer([FromBody] CustomerDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse(false, "Invalid data", ModelState));

            var exists = await dbContext.Customers.AnyAsync(c => c.Matricule == model.Matricule);
            if (exists)
                return BadRequest(new ApiResponse(false, $"Customer with matricule '{model.Matricule}' already exists."));

            // Validate Geographical Entities if provided
            if (model.GeographicalEntities != null && model.GeographicalEntities.Any())
            {
                var entityIds = model.GeographicalEntities.Select(g => g.GeographicalEntityId).ToList();
                var validEntities = await dbContext.GeographicalEntities
                    .Where(g => entityIds.Contains(g.Id) && g.IsActive)
                    .Select(g => g.Id)
                    .ToListAsync();

                var invalidIds = entityIds.Except(validEntities).ToList();
                if (invalidIds.Any())
                    return BadRequest(new ApiResponse(false,
                        $"Les entités géographiques avec IDs {string.Join(", ", invalidIds)} sont invalides ou inactives"));
            }

            var customer = new Customer
            {
                SourceSystem = DataSource.TMS,
                ExternalId = null,
                Name = model.Name,
                Phone = model.Phone,
                PhoneCountry = model.PhoneCountry ?? "tn",
                Email = model.Email,
                Matricule = model.Matricule,
                Contact = model.Contact,
                Address = model.Address,
                Latitude = model.Latitude,
                Longitude = model.Longitude,
                CustomerGeographicalEntities = new List<CustomerGeographicalEntity>()
            };

            // Add geographical entities
            if (model.GeographicalEntities != null && model.GeographicalEntities.Any())
            {
                foreach (var geoDto in model.GeographicalEntities)
                {
                    customer.CustomerGeographicalEntities.Add(new CustomerGeographicalEntity
                    {
                        GeographicalEntityId = geoDto.GeographicalEntityId
                    });
                }
            }

            dbContext.Customers.Add(customer);
            await dbContext.SaveChangesAsync();

            // Load the created customer with relationships
            var createdCustomer = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .FirstOrDefaultAsync(c => c.Id == customer.Id);

            var customerDto = new CustomerDto
            {
                Id = createdCustomer.Id,
                Name = createdCustomer.Name,
                Phone = createdCustomer.Phone,
                PhoneCountry = createdCustomer.PhoneCountry,
                Email = createdCustomer.Email,
                Matricule = createdCustomer.Matricule,
                Contact = createdCustomer.Contact,
                Address = createdCustomer.Address,
                Latitude = createdCustomer.Latitude,
                Longitude = createdCustomer.Longitude,
                SourceSystem = createdCustomer.SourceSystem.ToString(),
                GeographicalEntities = createdCustomer.CustomerGeographicalEntities?
                    .Where(cg => cg.GeographicalEntity != null && cg.GeographicalEntity.IsActive)
                    .Select(cg => new CustomerGeographicalEntityDto
                    {
                        GeographicalEntityId = cg.GeographicalEntityId,
                        GeographicalEntityName = cg.GeographicalEntity.Name,
                        LevelName = cg.GeographicalEntity.Level?.Name,
                        LevelNumber = cg.GeographicalEntity.Level?.LevelNumber ?? 0,
                        Latitude = cg.GeographicalEntity.Latitude.HasValue ? (double?)cg.GeographicalEntity.Latitude.Value : null,
                        Longitude = cg.GeographicalEntity.Longitude.HasValue ? (double?)cg.GeographicalEntity.Longitude.Value : null
                    }).ToList() ?? new List<CustomerGeographicalEntityDto>()
            };

            return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id },
                new ApiResponse(true, "Customer created successfully", customerDto));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(int id, [FromBody] CustomerDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse(false, "Invalid data", ModelState));

            var customer = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null)
                return NotFound(new ApiResponse(false, $"Customer with ID {id} not found"));

            var existingCustomer = await dbContext.Customers
                .FirstOrDefaultAsync(c => c.Matricule == model.Matricule && c.Id != id);

            if (existingCustomer != null)
                return BadRequest(new ApiResponse(false, $"Customer with matricule '{model.Matricule}' already exists."));

            // Validate Geographical Entities if provided
            if (model.GeographicalEntities != null && model.GeographicalEntities.Any())
            {
                var entityIds = model.GeographicalEntities.Select(g => g.GeographicalEntityId).ToList();
                var validEntities = await dbContext.GeographicalEntities
                    .Where(g => entityIds.Contains(g.Id) && g.IsActive)
                    .Select(g => g.Id)
                    .ToListAsync();

                var invalidIds = entityIds.Except(validEntities).ToList();
                if (invalidIds.Any())
                    return BadRequest(new ApiResponse(false,
                        $"Les entités géographiques avec IDs {string.Join(", ", invalidIds)} sont invalides ou inactives"));
            }

            // Update customer properties
            customer.Name = model.Name;
            customer.Phone = model.Phone;
            customer.PhoneCountry = model.PhoneCountry ?? "tn";
            customer.Email = model.Email;
            customer.Matricule = model.Matricule;
            customer.Contact = model.Contact;
            customer.Address = model.Address;
            customer.Latitude = model.Latitude;
            customer.Longitude = model.Longitude;
            customer.UpdatedAt = DateTime.UtcNow;

            // Update geographical entities
            if (model.GeographicalEntities != null)
            {
                // Remove old associations
                if (customer.CustomerGeographicalEntities != null && customer.CustomerGeographicalEntities.Any())
                {
                    dbContext.CustomerGeographicalEntities.RemoveRange(customer.CustomerGeographicalEntities);
                }

                // Add new associations
                if (model.GeographicalEntities.Any())
                {
                    customer.CustomerGeographicalEntities = model.GeographicalEntities.Select(geoDto => new CustomerGeographicalEntity
                    {
                        CustomerId = customer.Id,
                        GeographicalEntityId = geoDto.GeographicalEntityId
                    }).ToList();
                }
            }

            await dbContext.SaveChangesAsync();

            // Load updated customer with relationships
            var updatedCustomer = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .FirstOrDefaultAsync(c => c.Id == id);

            var customerDto = new CustomerDto
            {
                Id = updatedCustomer.Id,
                Name = updatedCustomer.Name,
                Phone = updatedCustomer.Phone,
                PhoneCountry = updatedCustomer.PhoneCountry,
                Email = updatedCustomer.Email,
                Matricule = updatedCustomer.Matricule,
                Contact = updatedCustomer.Contact,
                Address = updatedCustomer.Address,
                Latitude = updatedCustomer.Latitude,
                Longitude = updatedCustomer.Longitude,
                SourceSystem = updatedCustomer.SourceSystem.ToString(),
                GeographicalEntities = updatedCustomer.CustomerGeographicalEntities?
                    .Where(cg => cg.GeographicalEntity != null && cg.GeographicalEntity.IsActive)
                    .Select(cg => new CustomerGeographicalEntityDto
                    {
                        GeographicalEntityId = cg.GeographicalEntityId,
                        GeographicalEntityName = cg.GeographicalEntity.Name,
                        LevelName = cg.GeographicalEntity.Level?.Name,
                        LevelNumber = cg.GeographicalEntity.Level?.LevelNumber ?? 0,
                        Latitude = cg.GeographicalEntity.Latitude.HasValue ? (double?)cg.GeographicalEntity.Latitude.Value : null,
                        Longitude = cg.GeographicalEntity.Longitude.HasValue ? (double?)cg.GeographicalEntity.Longitude.Value : null
                    }).ToList() ?? new List<CustomerGeographicalEntityDto>()
            };

            return Ok(new ApiResponse(true, "Customer updated successfully", customerDto));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            var customer = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (customer == null)
                return NotFound(new ApiResponse(false, $"Customer with ID {id} not found"));

            // Check if customer has any orders
            var hasOrders = await dbContext.Orders.AnyAsync(o => o.CustomerId == id);
            if (hasOrders)
            {
                return BadRequest(new ApiResponse(false,
                    "Cannot delete customer because they have associated orders"));
            }

            // Remove geographical entity associations
            if (customer.CustomerGeographicalEntities != null && customer.CustomerGeographicalEntities.Any())
            {
                dbContext.CustomerGeographicalEntities.RemoveRange(customer.CustomerGeographicalEntities);
            }

            dbContext.Customers.Remove(customer);
            await dbContext.SaveChangesAsync();

            return Ok(new ApiResponse(true, "Customer deleted successfully"));
        }

        [HttpGet("list")]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomersList()
        {
            var customers = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .AsNoTracking()
                .AsSplitQuery()
                .ToListAsync();

            var customerDtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                Phone = c.Phone,
                PhoneCountry = c.PhoneCountry,
                Email = c.Email,
                Matricule = c.Matricule,
                Contact = c.Contact,
                SourceSystem = c.SourceSystem.ToString(),
                GeographicalEntities = c.CustomerGeographicalEntities?
                    .Where(cg => cg.GeographicalEntity != null && cg.GeographicalEntity.IsActive)
                    .Select(cg => new CustomerGeographicalEntityDto
                    {
                        GeographicalEntityId = cg.GeographicalEntityId,
                        GeographicalEntityName = cg.GeographicalEntity.Name,
                        LevelName = cg.GeographicalEntity.Level?.Name,
                        LevelNumber = cg.GeographicalEntity.Level?.LevelNumber ?? 0,
                        Latitude = cg.GeographicalEntity.Latitude.HasValue ? (double?)cg.GeographicalEntity.Latitude.Value : null,
                        Longitude = cg.GeographicalEntity.Longitude.HasValue ? (double?)cg.GeographicalEntity.Longitude.Value : null
                    }).ToList() ?? new List<CustomerGeographicalEntityDto>()
            }).ToList();

            return Ok(customerDtos);
        }

        [HttpGet("with-ready-to-load-orders")]
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomersWithReadyToLoadOrders()
        {
            var customers = await dbContext.Customers
               
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .Where(c => c.Orders.Any(o => o.Status == OrderStatus.ReadyToLoad))
                .AsNoTracking()
                .AsSplitQuery()
                .ToListAsync();

            var customerDtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                Phone = c.Phone,
                PhoneCountry = c.PhoneCountry,
                Email = c.Email,
                Matricule = c.Matricule,
                Contact = c.Contact,
                SourceSystem = c.SourceSystem.ToString(),
                GeographicalEntities = c.CustomerGeographicalEntities?
                    .Where(cg => cg.GeographicalEntity != null && cg.GeographicalEntity.IsActive)
                    .Select(cg => new CustomerGeographicalEntityDto
                    {
                        GeographicalEntityId = cg.GeographicalEntityId,
                        GeographicalEntityName = cg.GeographicalEntity.Name,
                        LevelName = cg.GeographicalEntity.Level?.Name,
                        LevelNumber = cg.GeographicalEntity.Level?.LevelNumber ?? 0,
                        Latitude = cg.GeographicalEntity.Latitude.HasValue ? (double?)cg.GeographicalEntity.Latitude.Value : null,
                        Longitude = cg.GeographicalEntity.Longitude.HasValue ? (double?)cg.GeographicalEntity.Longitude.Value : null
                    }).ToList() ?? new List<CustomerGeographicalEntityDto>()
            }).ToList();

            return Ok(customerDtos);
        }

        [HttpGet("{id}/name")]
        public async Task<ActionResult<string>> GetCustomerName(int id)
        {
            var customer = await dbContext.Customers
                .Where(c => c.Id == id)
                .Select(c => c.Name)
                .FirstOrDefaultAsync();

            if (customer == null)
                return NotFound($"Customer with ID {id} not found");

            return Ok(customer);
        }

        // GET: api/Customer/by-geographical-entity/{entityId}
        [HttpGet("by-geographical-entity/{entityId}")]
        public async Task<IActionResult> GetCustomersByGeographicalEntity(int entityId)
        {
            var customers = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .Where(c => c.CustomerGeographicalEntities.Any(cg => cg.GeographicalEntityId == entityId))
                .ToListAsync();

            var customerDtos = customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                Name = c.Name,
                Phone = c.Phone,
                PhoneCountry = c.PhoneCountry,
                Email = c.Email,
                Matricule = c.Matricule,
                Contact = c.Contact,
                SourceSystem = c.SourceSystem.ToString()
            }).ToList();

            return Ok(customerDtos);
        }

        // GET: api/Customer/with-coordinates
        [HttpGet("with-coordinates")]
        public async Task<IActionResult> GetCustomersWithCoordinates()
        {
            var customers = await dbContext.Customers
                .Include(c => c.CustomerGeographicalEntities)
                    .ThenInclude(cg => cg.GeographicalEntity)
                        .ThenInclude(g => g.Level)
                .Where(c => c.CustomerGeographicalEntities.Any(cg =>
                    cg.GeographicalEntity.Latitude != null &&
                    cg.GeographicalEntity.Longitude != null))
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Matricule,
                    c.Phone,
                    c.Email,
                    GeographicalEntities = c.CustomerGeographicalEntities
                        .Where(cg => cg.GeographicalEntity.Latitude != null && cg.GeographicalEntity.Longitude != null)
                        .Select(cg => new
                        {
                            cg.GeographicalEntityId,
                            Name = cg.GeographicalEntity.Name,
                            Level = cg.GeographicalEntity.Level != null ? cg.GeographicalEntity.Level.Name : null,
                            cg.GeographicalEntity.Latitude,
                            cg.GeographicalEntity.Longitude
                        }).ToList()
                })
                .ToListAsync();

            return Ok(customers);
        }
    }
}