using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Services
{
    public class OrderSyncService
    {
        private readonly QadDbContext _qad;
        private readonly ApplicationDbContext _tms;

        public OrderSyncService(QadDbContext qad, ApplicationDbContext tms)
        {
            _qad = qad;
            _tms = tms;
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
                    _tms.Customers.Add(new Customer
                    {
                        SourceSystem = DataSource.QAD,
                        ExternalId = externalId,
                        Matricule = externalId,
                        Name = qc.Name1 ?? "N/A",
                        Adress = qc.Street1 ?? "N/A",
                        Gouvernorat = qc.City ?? "",
                        Phone = "",
                        City = qc.CountryCode ?? "",
                        Email = "",
                        Contact = "",
                        ZoneId = qc.ZoneId 
                    });
                }
            }

            await _tms.SaveChangesAsync();
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
