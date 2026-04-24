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
        private readonly IHttpClientFactory _httpClientFactory;

        public CustomerController(
            ApplicationDbContext context, 
            IRepository<Customer> customerRepository,
            IHttpClientFactory httpClientFactory)
        {
            this.customerRepository = customerRepository;
            dbContext = context;
            _httpClientFactory = httpClientFactory;
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

            // Auto-geocode address if coordinates are missing and address is provided
            if ((!customer.Latitude.HasValue || !customer.Longitude.HasValue) && !string.IsNullOrWhiteSpace(customer.Address))
            {
                try
                {
                    var geocodeResult = await GeocodeAddress(customer.Address);
                    if (geocodeResult != null && geocodeResult.ContainsKey("lat") && geocodeResult.ContainsKey("lon"))
                    {
                        customer.Latitude = Convert.ToDouble(geocodeResult["lat"]);
                        customer.Longitude = Convert.ToDouble(geocodeResult["lon"]);
                        Console.WriteLine($"✅ Customer '{customer.Name}' auto-geocoded: {customer.Latitude}, {customer.Longitude}");
                    }
                    else
                    {
                        Console.WriteLine($"⚠️ Could not geocode address for customer '{customer.Name}': {customer.Address}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error geocoding customer '{customer.Name}': {ex.Message}");
                    // Continue without coordinates - will be shown in red in UI
                }
            }

            // AUTO-ASSIGN geographical entity based on GPS coordinates (for automatic mode)
            if (customer.Latitude.HasValue && customer.Longitude.HasValue)
            {
                try
                {
                    Console.WriteLine($"🔍 Auto-assigning geographical entity for customer '{customer.Name}' at coords: {customer.Latitude.Value}, {customer.Longitude.Value}");
                    
                    // Find the closest geographical entity to the customer's coordinates
                    var allEntities = await dbContext.GeographicalEntities
                        .Where(g => g.IsActive && g.Latitude.HasValue && g.Longitude.HasValue)
                        .ToListAsync();

                    Console.WriteLine($"📊 Found {allEntities.Count} active geographical entities with GPS coordinates");

                    if (allEntities.Any())
                    {
                        // Calculate distance to each entity and find the closest one
                        var closestEntity = allEntities
                            .Select(e => new 
                            { 
                                Entity = e, 
                                Distance = Math.Sqrt(
                                    Math.Pow((double)e.Latitude.Value - customer.Latitude.Value, 2) + 
                                    Math.Pow((double)e.Longitude.Value - customer.Longitude.Value, 2)
                                )
                            })
                            .OrderBy(x => x.Distance)
                            .FirstOrDefault();

                        Console.WriteLine($"🎯 Closest entity: '{closestEntity.Entity.Name}' at distance: {closestEntity.Distance:F4} degrees (~{closestEntity.Distance * 111:F1} km)");

                        // If the closest entity is within reasonable distance (< 100km ~ 1.0 degree approx)
                        if (closestEntity != null && closestEntity.Distance < 1.0)
                        {
                            Console.WriteLine($"✅ Auto-assigned geographical entity '{closestEntity.Entity.Name}' to customer '{customer.Name}' (distance: {closestEntity.Distance:F4})");
                            
                            // Remove old associations
                            if (customer.CustomerGeographicalEntities != null && customer.CustomerGeographicalEntities.Any())
                            {
                                dbContext.CustomerGeographicalEntities.RemoveRange(customer.CustomerGeographicalEntities);
                                customer.CustomerGeographicalEntities.Clear();
                            }

                            // Add new association
                            customer.CustomerGeographicalEntities = new List<CustomerGeographicalEntity>
                            {
                                new CustomerGeographicalEntity
                                {
                                    CustomerId = customer.Id,
                                    GeographicalEntityId = closestEntity.Entity.Id
                                }
                            };
                        }
                        else
                        {
                            Console.WriteLine($"⚠️ No geographical entity found within 100km range for customer '{customer.Name}'. Closest was '{closestEntity?.Entity.Name}' at {closestEntity?.Distance:F4} degrees");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"⚠️ NO geographical entities with GPS coordinates found in database!");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error auto-assigning geographical entity: {ex.Message}");
                    Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
                    // Continue without geographical entity - not critical
                }
            }

            // Add geographical entities (manual mode or override)
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
            
            // If coordinates are explicitly provided, use them
            if (model.Latitude.HasValue && model.Longitude.HasValue)
            {
                customer.Latitude = model.Latitude;
                customer.Longitude = model.Longitude;
            }
            // Otherwise, try to geocode the address if it changed or coordinates are missing
            else if (!string.IsNullOrWhiteSpace(model.Address) && 
                     (model.Address != customer.Address || !customer.Latitude.HasValue || !customer.Longitude.HasValue))
            {
                try
                {
                    var geocodeResult = await GeocodeAddress(model.Address);
                    if (geocodeResult != null && geocodeResult.ContainsKey("lat") && geocodeResult.ContainsKey("lon"))
                    {
                        customer.Latitude = Convert.ToDouble(geocodeResult["lat"]);
                        customer.Longitude = Convert.ToDouble(geocodeResult["lon"]);
                        Console.WriteLine($"✅ Customer '{customer.Name}' auto-geocoded on update: {customer.Latitude}, {customer.Longitude}");
                    }
                    else
                    {
                        Console.WriteLine($"⚠️ Could not geocode address for customer '{customer.Name}' on update: {model.Address}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error geocoding customer '{customer.Name}' on update: {ex.Message}");
                    // Continue without coordinates - will be shown in red in UI
                }
            }
            
            customer.UpdatedAt = DateTime.UtcNow;

            // AUTO-ASSIGN geographical entity based on GPS coordinates (for automatic mode)
            if (customer.Latitude.HasValue && customer.Longitude.HasValue)
            {
                try
                {
                    // Find the closest geographical entity to the customer's coordinates
                    var allEntities = await dbContext.GeographicalEntities
                        .Where(g => g.IsActive && g.Latitude.HasValue && g.Longitude.HasValue)
                        .ToListAsync();

                    if (allEntities.Any())
                    {
                        // Calculate distance to each entity and find the closest one
                        var closestEntity = allEntities
                            .Select(e => new 
                            { 
                                Entity = e, 
                                Distance = Math.Sqrt(
                                    Math.Pow((double)e.Latitude.Value - customer.Latitude.Value, 2) + 
                                    Math.Pow((double)e.Longitude.Value - customer.Longitude.Value, 2)
                                )
                            })
                            .OrderBy(x => x.Distance)
                            .FirstOrDefault();

                        // If the closest entity is within reasonable distance (< 50km ~ 0.5 degrees approx)
                        if (closestEntity != null && closestEntity.Distance < 0.5)
                        {
                            Console.WriteLine($"✅ Auto-assigned geographical entity '{closestEntity.Entity.Name}' to customer '{customer.Name}' (distance: {closestEntity.Distance:F4})");
                            
                            // Remove old associations
                            if (customer.CustomerGeographicalEntities != null && customer.CustomerGeographicalEntities.Any())
                            {
                                dbContext.CustomerGeographicalEntities.RemoveRange(customer.CustomerGeographicalEntities);
                                customer.CustomerGeographicalEntities.Clear();
                            }

                            // Add new association
                            customer.CustomerGeographicalEntities = new List<CustomerGeographicalEntity>
                            {
                                new CustomerGeographicalEntity
                                {
                                    CustomerId = customer.Id,
                                    GeographicalEntityId = closestEntity.Entity.Id
                                }
                            };
                        }
                        else
                        {
                            Console.WriteLine($"⚠️ No geographical entity found within range for customer '{customer.Name}'");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error auto-assigning geographical entity: {ex.Message}");
                    // Continue without geographical entity - not critical
                }
            }

            // Update geographical entities (manual mode or override)
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

        /// <summary>
        /// Géocoder une adresse en utilisant l'API Nominatim (OpenStreetMap)
        /// </summary>
        private async Task<Dictionary<string, string>?> GeocodeAddress(string address)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("User-Agent", "TMS-App/1.0");
                
                var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(address)}&format=json&limit=1";
                var response = await httpClient.GetAsync(url);
                
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var results = System.Text.Json.JsonSerializer.Deserialize<List<JsonElement>>(json);
                    
                    if (results != null && results.Count > 0)
                    {
                        var lat = results[0].GetProperty("lat").GetString();
                        var lon = results[0].GetProperty("lon").GetString();
                        
                        if (!string.IsNullOrEmpty(lat) && !string.IsNullOrEmpty(lon))
                        {
                            return new Dictionary<string, string>
                            {
                                { "lat", lat },
                                { "lon", lon }
                            };
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error geocoding address '{address}': {ex.Message}");
            }
            
            return null;
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
                Address = c.Address,
                Latitude = c.Latitude,
                Longitude = c.Longitude,
                SourceSystem = c.SourceSystem.ToString()
            }).ToList();

            return Ok(customerDtos);
        }
    }
}