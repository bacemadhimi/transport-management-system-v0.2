using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Services
{
    public class OrderSyncService
    {
        private readonly QadDbContext _qad;
        private readonly ApplicationDbContext _tms;
        private readonly IHttpClientFactory _httpClientFactory;

        public OrderSyncService(QadDbContext qad, ApplicationDbContext tms, IHttpClientFactory httpClientFactory)
        {
            _qad = qad;
            _tms = tms;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<SyncHistory> SyncSalesOrdersAsync()
        {
           
            await SyncCustomersAsync();

     
            var lastSync = await _tms.SyncHistories
                .OrderByDescending(x => x.SyncDate)
                .Select(x => (DateTime?)x.SyncDate)
                .FirstOrDefaultAsync()
                ?? DateTime.MinValue;

     
            var salesOrders = await _qad.SoMstr
                .Include(x => x.Customer)
                .Where(x => x.SoUpdatedDate >= lastSync)
                .ToListAsync();

            var history = new SyncHistory
            {
                Source = "QAD",
                SyncDate = DateTime.UtcNow,
                TotalRecords = salesOrders.Count,
                ProcessedRecords = 0,
                Status = "Running"
            };

            _tms.SyncHistories.Add(history);
            await _tms.SaveChangesAsync();

            foreach (var so in salesOrders)
            {
                try
                {
                    var customerExternalId = so.CustomerId.ToString();

                   
                    var customer = await _tms.Customers.FirstOrDefaultAsync(c =>
                        c.SourceSystem == DataSource.QAD &&
                        c.ExternalId == customerExternalId);

                    if (customer == null)
                    {
                        
                        _tms.SyncHistoryDetails.Add(new SyncHistoryDetail
                        {
                            SyncHistoryId = history.Id,
                            OrderNumber = so.SoNbr,
                            Status = "Erreur",
                            Notes = "Customer non trouvé"
                        });

                        history.ProcessedRecords++;
                        await _tms.SaveChangesAsync();
                        continue;
                    }

                    
                    var order = await _tms.Orders.FirstOrDefaultAsync(o =>
                        o.SourceSystem == DataSource.QAD &&
                        o.ExternalId == so.SoNbr);

                    if (order == null)
                    {
                        order = new Order
                        {
                            SourceSystem = DataSource.QAD,
                            ExternalId = so.SoNbr,
                            Reference = so.SoNbr,
                            Type = "SO",
                            CustomerId = customer.Id,
                            CreatedDate = so.SoOrdDate,
                            UpdatedDate = so.SoUpdatedDate ?? DateTime.UtcNow,
                            DeliveryDate = so.SoDeliveryDate,
                            DeliveryAddress = so.SoShipTo ?? "N/A",
                            Status = OrderStatus.Pending,
             
                            Weight = so.TotalWeight ?? 0,       
                            WeightUnit = "palette",             
                            Priority = so.SoPriority ?? 5
                        };

                        _tms.Orders.Add(order);
                    }
                    else
                    {
                        order.CustomerId = customer.Id;
                        order.DeliveryAddress = so.SoShipTo ?? "N/A";
                        order.UpdatedDate = DateTime.UtcNow;
                        order.DeliveryDate = so.SoDeliveryDate;
                        order.Weight = so.TotalWeight ?? 0;    
                        order.WeightUnit = "palette";          
                    }

                    _tms.SyncHistoryDetails.Add(new SyncHistoryDetail
                    {
                        SyncHistoryId = history.Id,
                        OrderNumber = so.SoNbr,
                        Status = "OK",
                        Notes = ""
                    });
                }
                catch (Exception ex)
                {
                    _tms.SyncHistoryDetails.Add(new SyncHistoryDetail
                    {
                        SyncHistoryId = history.Id,
                        OrderNumber = so.SoNbr,
                        Status = "Erreur",
                        Notes = ex.Message
                    });
                }
                finally
                {
                    history.ProcessedRecords++;
                    await _tms.SaveChangesAsync();
                }
            }

            history.Status = "Success";
            await _tms.SaveChangesAsync();

            return history;
        }

        private async Task SyncCustomersAsync()
        {
            var qadCustomers = await _qad.CmMstr.ToListAsync();

            foreach (var qc in qadCustomers)
            {
                var externalId = qc.CmId.ToString();

                var exists = await _tms.Customers.FirstOrDefaultAsync(c =>
                    c.SourceSystem == DataSource.QAD &&
                    c.ExternalId == externalId);

                if (exists == null)
                {
                    var customer = new Customer
                    {
                        SourceSystem = DataSource.QAD,
                        ExternalId = externalId,
                        Matricule = externalId,
                        Name = qc.Name1 ?? "N/A",                      
                        Phone = "",
                        Email = "",
                        Contact = "",
                    };

                    // Try to geocode customer address if available
                    // Note: QAD CmMstr may not have address fields, so this is optional
                    // You can add address fields from QAD if they exist in CmMstr
                    /*
                    if (!string.IsNullOrWhiteSpace(qc.Address))
                    {
                        try
                        {
                            var geocodeResult = await GeocodeAddress(qc.Address);
                            if (geocodeResult != null)
                            {
                                customer.Latitude = Convert.ToDouble(geocodeResult["lat"]);
                                customer.Longitude = Convert.ToDouble(geocodeResult["lon"]);
                                Console.WriteLine($"✅ QAD Customer '{customer.Name}' geocoded: {customer.Latitude}, {customer.Longitude}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"⚠️ Failed to geocode QAD customer '{customer.Name}': {ex.Message}");
                        }
                    }
                    */

                    _tms.Customers.Add(customer);
                }
            }

            await _tms.SaveChangesAsync();
        }

        /// <summary>
        /// Géocode une adresse via Nominatim
        /// </summary>
        private async Task<Dictionary<string, string>?> GeocodeAddress(string address)
        {
            if (string.IsNullOrWhiteSpace(address))
                return null;

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("User-Agent", "TMS-QAD-Sync/1.0");
                client.Timeout = TimeSpan.FromSeconds(5);

                var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(address)}&format=json&limit=1&countrycodes=tn&accept-language=fr";
                
                var response = await client.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                    return null;

                var content = await response.Content.ReadAsStringAsync();
                var results = JsonSerializer.Deserialize<List<JsonElement>>(content);

                if (results != null && results.Count > 0)
                {
                    var result = results[0];
                    var lat = result.GetProperty("lat").GetString();
                    var lon = result.GetProperty("lon").GetString();

                    if (!string.IsNullOrEmpty(lat) && !string.IsNullOrEmpty(lon))
                    {
                        return new Dictionary<string, string>
                        {
                            { "lat", lat },
                            { "lon", lon }
                        };
                    }
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error geocoding address: {ex.Message}");
                return null;
            }
        }

        public async Task<SyncHistory?> GetLastSyncAsync()
        {
            return await _tms.SyncHistories
                .OrderByDescending(x => x.SyncDate)
                .Include(x => x.Details)
                .FirstOrDefaultAsync();
        }

        public async Task<List<SyncHistory>> GetAllHistoryAsync()
        {
            return await _tms.SyncHistories
                .OrderByDescending(x => x.SyncDate)
                .Include(x => x.Details)
                .ToListAsync();
        }
    }
}
