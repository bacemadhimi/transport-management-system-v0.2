using Microsoft.AspNetCore.SignalR;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Hubs;
using Microsoft.EntityFrameworkCore;

namespace TransportManagementSystem.Service
{
    public interface IGPSService
    {
        Task<PositionGPS> SavePositionAsync(int? driverId, int? truckId, double latitude, double longitude, string source = "Mobile");
        Task<List<PositionGPS>> GetPositionsAsync(int? driverId, int? truckId, DateTime? startDate, DateTime? endDate);
        Task<List<PositionGPS>> GetLatestPositionsAsync(int limit = 50);
        Task<PositionGPS?> GetLatestPositionByDriverAsync(int driverId);
        Task<PositionGPS?> GetLatestPositionByTruckAsync(int truckId);
        Task SynchronizeOfflinePositionsAsync(List<PositionGPS> positions);
    }

    public class GPSService : IGPSService
    {
        private readonly IRepository<PositionGPS> _positionRepository;
        private readonly ApplicationDbContext _dbContext;
        private readonly IHubContext<GPSHub> _hubContext;

        public GPSService(
            IRepository<PositionGPS> positionRepository, 
            ApplicationDbContext dbContext,
            IHubContext<GPSHub> hubContext)
        {
            _positionRepository = positionRepository;
            _dbContext = dbContext;
            _hubContext = hubContext;
        }

        public async Task<PositionGPS> SavePositionAsync(int? driverId, int? truckId, double latitude, double longitude, string source = "Mobile")
        {
            // Validation des coordonnées
            if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
                throw new ArgumentException("Coordonnées GPS invalides");

            var position = new PositionGPS
            {
                DriverId = driverId,
                TruckId = truckId,
                Latitude = latitude,
                Longitude = longitude,
                Timestamp = DateTime.UtcNow,
                Source = source,
                IsSynchronized = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _positionRepository.AddAsync(position);
            await _positionRepository.SaveChangesAsync();

            // 🚀 DIFFUSER LA POSITION À TOUS LES CLIENTS CONNECTÉS EN TEMPS RÉEL
            var positionData = new
            {
                position.Id,
                position.DriverId,
                position.TruckId,
                position.Latitude,
                position.Longitude,
                position.Timestamp,
                position.Source
            };

            await _hubContext.Clients.All.SendAsync("ReceiveGPSPosition", positionData);
            await _hubContext.Clients.All.SendAsync("ReceivePosition", positionData);

            return position;
        }

        public async Task<List<PositionGPS>> GetPositionsAsync(int? driverId, int? truckId, DateTime? startDate, DateTime? endDate)
        {
            var query = _positionRepository.Query();

            if (driverId.HasValue)
                query = query.Where(p => p.DriverId == driverId);

            if (truckId.HasValue)
                query = query.Where(p => p.TruckId == truckId);

            if (startDate.HasValue)
                query = query.Where(p => p.Timestamp >= startDate);

            if (endDate.HasValue)
                query = query.Where(p => p.Timestamp <= endDate);

            return await query.OrderByDescending(p => p.Timestamp).ToListAsync();
        }

        public async Task<List<PositionGPS>> GetLatestPositionsAsync(int limit = 50)
        {
            return await _positionRepository.Query()
                .OrderByDescending(p => p.Timestamp)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<PositionGPS?> GetLatestPositionByDriverAsync(int driverId)
        {
            return await _positionRepository.Query()
                .Where(p => p.DriverId == driverId)
                .OrderByDescending(p => p.Timestamp)
                .FirstOrDefaultAsync();
        }

        public async Task<PositionGPS?> GetLatestPositionByTruckAsync(int truckId)
        {
            return await _positionRepository.Query()
                .Where(p => p.TruckId == truckId)
                .OrderByDescending(p => p.Timestamp)
                .FirstOrDefaultAsync();
        }

        public async Task SynchronizeOfflinePositionsAsync(List<PositionGPS> positions)
        {
            foreach (var position in positions)
            {
                if (!position.IsSynchronized)
                {
                    position.IsSynchronized = true;
                    position.UpdatedAt = DateTime.UtcNow;
                    // Marquer comme modifié pour EF Core
                    _dbContext.PositionsGPS.Update(position);
                }
            }
            await _dbContext.SaveChangesAsync();
        }
    }
}
