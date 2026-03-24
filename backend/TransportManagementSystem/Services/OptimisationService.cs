using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Services
{
    public interface IOptimisationService
    {
        Task<ResultatOptimisation> OptimizeRouteAsync(int tripId, List<OptimizationPointDto> points, int vehicleCount = 1);
        Task<ResultatOptimisation?> GetOptimisationResultAsync(int tripId);
        Task<double> CalculateDistanceAsync(double lat1, double lng1, double lat2, double lng2);
        Task<double> CalculateEstimatedTimeAsync(double distanceKm);
    }

    public class OptimisationService : IOptimisationService
    {
        private readonly IRepository<ResultatOptimisation> _resultRepository;
        private readonly IRepository<Trip> _tripRepository;
        private readonly ApplicationDbContext _dbContext;
        private readonly HttpClient _httpClient;

        public OptimisationService(
            IRepository<ResultatOptimisation> resultRepository,
            IRepository<Trip> tripRepository,
            ApplicationDbContext dbContext)
        {
            _resultRepository = resultRepository;
            _tripRepository = tripRepository;
            _dbContext = dbContext;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "TransportManagementSystem/Optimisation");
        }

        public async Task<ResultatOptimisation> OptimizeRouteAsync(int tripId, List<OptimizationPointDto> points, int vehicleCount = 1)
        {
            if (points == null || points.Count < 2)
                throw new ArgumentException("Au moins deux points sont requis");

            if (vehicleCount < 1)
                vehicleCount = 1;

            var trip = await _tripRepository.Query().FirstOrDefaultAsync(t => t.Id == tripId);
            if (trip == null)
                throw new ArgumentException($"Trajet {tripId} introuvable");

            var osrmMatrix = await FetchOsrmTableAsync(points);

            var order = ComputeGreedyOrder(osrmMatrix);
            order = TwoOptImprove(order, osrmMatrix);

            var optimizedPoints = order.Select(index => points[index]).ToList();
            var vehicleRoutes = SplitForVehicles(optimizedPoints, vehicleCount);

            double optimizedDistance = CountRouteDistance(vehicleRoutes, osrmMatrix, points);
            double estimatedTime = await CalculateEstimatedTimeAsync(optimizedDistance);
            double estimatedCost = optimizedDistance * 0.55;

            var result = new ResultatOptimisation
            {
                TripId = tripId,
                DistanceOptimale = optimizedDistance,
                TempsEstime = (int)Math.Round(estimatedTime),
                CoutEstime = Math.Round(estimatedCost, 2),
                ItineraireOptimise = JsonSerializer.Serialize(vehicleRoutes),
                EconomieDistance = null,
                EconomieTemps = null,
                DateCalcul = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _resultRepository.AddAsync(result);
            return result;
        }

        public async Task<ResultatOptimisation?> GetOptimisationResultAsync(int tripId)
        {
            return await _resultRepository.Query()
                .Where(r => r.TripId == tripId)
                .OrderByDescending(r => r.DateCalcul)
                .FirstOrDefaultAsync();
        }

        public async Task<double> CalculateDistanceAsync(double lat1, double lng1, double lat2, double lng2)
        {
            return await Task.FromResult(HaversineDistance(lat1, lng1, lat2, lng2));
        }

        public async Task<double> CalculateEstimatedTimeAsync(double distanceKm)
        {
            const double averageSpeedKmh = 60d;
            var timeMinutes = distanceKm / averageSpeedKmh * 60;
            return await Task.FromResult(timeMinutes);
        }

        private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371d;
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private static double ToRadians(double degrees) => degrees * Math.PI / 180;

        private async Task<OsrmTableResponse> FetchOsrmTableAsync(List<OptimizationPointDto> points)
        {
            var coord = string.Join(";", points.Select(p => $"{p.Lng},{p.Lat}"));
            var url = $"https://router.project-osrm.org/table/v1/driving/{coord}?annotations=distance";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var table = await response.Content.ReadFromJsonAsync<OsrmTableResponse>();

            if (table == null || table.Code != "Ok" || table.Distances == null)
                throw new InvalidOperationException("Impossible de récupérer la matrice OSRM");

            return table;
        }

        private List<int> ComputeGreedyOrder(OsrmTableResponse table)
        {
            var n = table.Distances.Length;
            var order = new List<int> { 0 };
            var remaining = new HashSet<int>(Enumerable.Range(1, n - 1));
            int current = 0;

            while (remaining.Any())
            {
                var next = remaining.OrderBy(i => table.Distances[current][i]).First();
                order.Add(next);
                remaining.Remove(next);
                current = next;
            }

            return order;
        }

        private List<int> TwoOptImprove(List<int> order, OsrmTableResponse table)
        {
            var n = order.Count;
            var improved = true;

            while (improved)
            {
                improved = false;
                for (int i = 1; i < n - 2; i++)
                {
                    for (int j = i + 1; j < n - 1; j++)
                    {
                        var a = table.Distances[order[i - 1]][order[i]] + table.Distances[order[j]][order[j + 1]];
                        var b = table.Distances[order[i - 1]][order[j]] + table.Distances[order[i]][order[j + 1]];
                        if (b + 1e-6 < a)
                        {
                            order.Reverse(i, j - i + 1);
                            improved = true;
                        }
                    }
                }
            }

            return order;
        }

        private List<List<OptimizationPointDto>> SplitForVehicles(List<OptimizationPointDto> points, int vehicleCount)
        {
            if (vehicleCount <= 1)
                return new List<List<OptimizationPointDto>> { points };

            var routes = new List<List<OptimizationPointDto>>();
            int chunkSize = (int)Math.Ceiling((double)points.Count / vehicleCount);

            for (int i = 0; i < vehicleCount; i++)
            {
                var chunk = points.Skip(i * chunkSize).Take(chunkSize).ToList();
                if (chunk.Any())
                    routes.Add(chunk);
            }

            return routes;
        }

        private double CountRouteDistance(List<List<OptimizationPointDto>> routes, OsrmTableResponse table, List<OptimizationPointDto> allPoints)
        {
            double total = 0;

            foreach (var route in routes)
            {
                for (int i = 0; i < route.Count - 1; i++)
                {
                    var a = allPoints.IndexOf(route[i]);
                    var b = allPoints.IndexOf(route[i + 1]);
                    if (a >= 0 && b >= 0)
                    {
                        total += table.Distances[a][b] / 1000d;
                    }
                }
            }

            return total;
        }

        private class OsrmTableResponse
        {
            public string Code { get; set; } = string.Empty;
            public double[][]? Distances { get; set; }
        }
    }
}