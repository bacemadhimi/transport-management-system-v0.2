using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Services
{
    public class SyncService
    {
        private readonly ApplicationDbContext _db;

        public SyncService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<SyncHistory> StartSyncAsync()
        {
            var history = new SyncHistory
            {
                Source = "QAD",
                SyncDate = DateTime.UtcNow,
                TotalRecords = 0,
                ProcessedRecords = 0,
                Status = "Running"
            };

            _db.SyncHistories.Add(history);
            await _db.SaveChangesAsync();

            try
            {
            
                var orders = await _db.Orders.ToListAsync(); 

                history.TotalRecords = orders.Count;
                await _db.SaveChangesAsync();

                foreach (var order in orders)
                {
                  
                    history.ProcessedRecords++;
                    await _db.SaveChangesAsync();
                }

                history.Status = "Success";
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                history.Status = "Error";
                await _db.SaveChangesAsync();
            }

            return history;
        }

        public async Task<SyncHistory> GetLastSyncAsync()
        {
            return await _db.SyncHistories
                .OrderByDescending(x => x.SyncDate)
                .Include(x => x.Details)
                .FirstOrDefaultAsync();
        }
    }
}
