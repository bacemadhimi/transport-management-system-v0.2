using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.DTOs;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Services;

public class StatisticsService : IStatisticsService
{
    private readonly ApplicationDbContext _context;

    public StatisticsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TripStatisticsDto> GetTripStatisticsAsync(StatisticsFilterDto filter)
    {
        return new TripStatisticsDto
        {
            StatusDistribution = await GetTripStatusDistributionAsync(filter),
            TruckUtilization = await GetTruckUtilizationAsync(filter),
            DeliveryByType = await GetOrdersByTypeAsync(filter),
            GeneratedAt = DateTime.UtcNow
        };
    }

    public async Task<List<PieChartData>> GetTripStatusDistributionAsync(StatisticsFilterDto filter)
    {
        var query = _context.Trips.AsQueryable();

        // Apply filters
        if (filter.StartDate.HasValue)
            query = query.Where(t => t.CreatedAt >= filter.StartDate.Value);
        if (filter.EndDate.HasValue)
            query = query.Where(t => t.CreatedAt <= filter.EndDate.Value);
        if (filter.TruckId.HasValue)
            query = query.Where(t => t.TruckId == filter.TruckId.Value);
        if (filter.DriverId.HasValue)
            query = query.Where(t => t.DriverId == filter.DriverId.Value);

        var statusGroups = await query
            .GroupBy(t => t.TripStatus)
            .Select(g => new
            {
                Status = g.Key,
                Count = g.Count(),
                TotalDistance = g.Sum(t => t.EstimatedDistance),
                TotalDuration = g.Sum(t => t.EstimatedDuration)
            })
            .ToListAsync();

        // Color mapping for each status
        var colorMap = new Dictionary<TripStatus, string>
        {
            { TripStatus.Planned, "#4e73df" },
            { TripStatus.Accepted, "#1cc88a" },
            { TripStatus.LoadingInProgress, "#36b9cc" },
            { TripStatus.DeliveryInProgress, "#f6c23e" },
            { TripStatus.Receipt, "#1cc88a" },
            { TripStatus.Cancelled, "#e74a3b" }
        };

        var totalTrips = statusGroups.Sum(g => g.Count);

        return statusGroups.Select(g => new PieChartData
        {
            Label = g.Status.ToString(),
            Value = totalTrips > 0 ? Math.Round((g.Count * 100m) / totalTrips, 2) : 0,
            Count = g.Count,
            Color = colorMap.TryGetValue(g.Status, out var color) ? color : "#858796"
        }).ToList();
    }

    public async Task<List<PieChartData>> GetTruckUtilizationAsync(StatisticsFilterDto filter)
    {
        var query = _context.Trips
            .Include(t => t.Truck)
            .AsQueryable();

        if (filter.StartDate.HasValue)
            query = query.Where(t => t.EstimatedStartDate >= filter.StartDate.Value);
        if (filter.EndDate.HasValue)
            query = query.Where(t => t.EstimatedStartDate <= filter.EndDate.Value);

        var truckStats = await query
            .GroupBy(t => new { t.TruckId, t.Truck.Immatriculation })
            .Select(g => new
            {
                TruckId = g.Key.TruckId,
                Immatriculation = g.Key.Immatriculation,
                TripCount = g.Count(),
                TotalDistance = g.Sum(t => t.EstimatedDistance),
                TotalHours = g.Sum(t => t.EstimatedDuration)
            })
            .OrderByDescending(x => x.TotalHours)
            .Take(10) // Top 10 trucks by utilization
            .ToListAsync();

        var totalHours = truckStats.Sum(t => t.TotalHours);

        return truckStats.Select((t, index) => new PieChartData
        {
            Label = t.Immatriculation,
            Value = totalHours > 0 ? Math.Round((t.TotalHours * 100m) / totalHours, 2) : 0,
            Count = t.TripCount,
            Color = GetChartColor(index)
        }).ToList();
    }

    public async Task<List<PieChartData>> GetOrdersByTypeAsync(StatisticsFilterDto filter)
    {
        var query = _context.Orders.AsQueryable();

        if (filter.StartDate.HasValue)
            query = query.Where(o => o.CreatedDate >= filter.StartDate.Value);
        if (filter.EndDate.HasValue)
            query = query.Where(o => o.CreatedDate <= filter.EndDate.Value);

        var orderTypes = await query
            .Where(o => !string.IsNullOrEmpty(o.Type))
            .GroupBy(o => o.Type)
            .Select(g => new
            {
                Type = g.Key,
                Count = g.Count(),
                TotalWeight = g.Sum(o => o.Weight)
            })
            .OrderByDescending(g => g.Count)
            .ToListAsync();

        var totalOrders = orderTypes.Sum(g => g.Count);

        return orderTypes.Select((g, index) => new PieChartData
        {
            Label = g.Type ?? "Unknown",
            Value = totalOrders > 0 ? Math.Round((g.Count * 100m) / totalOrders, 2) : 0,
            Count = g.Count,
            Color = GetChartColor(index)
        }).ToList();
    }

    private string GetChartColor(int index)
    {
        var colors = new[]
        {
            "#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b",
            "#5a5c69", "#6f42c1", "#20c9a6", "#fd7e14", "#e83e8c"
        };
        return colors[index % colors.Length];
    }

    public async Task<List<DriverStatisticsDto>> GetDriverStatisticsAsync(StatisticsFilterDto filter)
    {
        try
        {
            // Récupérer TOUS les chauffeurs de la base de données
            var allDrivers = await _context.Employees.OfType<Driver>().ToListAsync();
            
            if (allDrivers.Count == 0)
            {
                return new List<DriverStatisticsDto>();
            }

            // Requête pour obtenir les statistiques des trajets
            var tripsQuery = _context.Trips.AsQueryable();

            // Appliquer les filtres de date
            if (filter.StartDate.HasValue)
                tripsQuery = tripsQuery.Where(t => t.EstimatedStartDate >= filter.StartDate.Value);
            if (filter.EndDate.HasValue)
                tripsQuery = tripsQuery.Where(t => t.EstimatedEndDate <= filter.EndDate.Value);

            // Grouper les trajets par chauffeur
            var tripStatsByDriver = await tripsQuery
                .Where(t => t.DriverId > 0)
                .GroupBy(t => t.DriverId)
                .Select(g => new
                {
                    DriverId = g.Key,
                    TotalTrips = g.Count(),
                    TotalDistance = g.Sum(t => t.EstimatedDistance),
                    TotalDuration = g.Sum(t => t.EstimatedDuration),
                    CompletedTrips = g.Count(t => t.TripStatus == TripStatus.Receipt),
                    CancelledTrips = g.Count(t => t.TripStatus == TripStatus.Cancelled),
                    MinDate = g.Min(t => t.EstimatedStartDate),
                    MaxDate = g.Max(t => t.EstimatedEndDate)
                })
                .ToDictionaryAsync(x => x.DriverId);

            var result = new List<DriverStatisticsDto>();

            // Pour CHAQUE chauffeur, créer ses statistiques
            foreach (var driver in allDrivers)
            {
                // Récupérer les stats de ce chauffeur (ou null s'il n'a pas de trajets)
                tripStatsByDriver.TryGetValue(driver.Id, out var stats);

                var totalTrips = stats?.TotalTrips ?? 0;
                var totalDistance = stats?.TotalDistance ?? 0m;
                var totalDuration = stats?.TotalDuration ?? 0m;
                var completedTrips = stats?.CompletedTrips ?? 0;
                var cancelledTrips = stats?.CancelledTrips ?? 0;
                var minDate = stats?.MinDate;
                var maxDate = stats?.MaxDate;

                var totalDays = minDate.HasValue && maxDate.HasValue
                    ? Math.Max(1m, (decimal)(maxDate.Value - minDate.Value).TotalDays)
                    : 1m;

                var completionRate = totalTrips > 0
                    ? Math.Round((completedTrips * 100m) / totalTrips, 2)
                    : 0;

                var avgDistance = totalTrips > 0
                    ? Math.Round(totalDistance / totalTrips, 2)
                    : 0;

                var avgDuration = totalTrips > 0
                    ? Math.Round(totalDuration / totalTrips, 2)
                    : 0;

                var tripsPerDay = Math.Round((decimal)totalTrips / totalDays, 2);

                // Calcul du temps d'arrêt estimé (20% du temps total)
                var stopTimeHours = Math.Round(totalDuration * 0.2m, 2);
                var stopTimePercentage = totalDuration > 0
                    ? Math.Round((stopTimeHours * 100m) / totalDuration, 2)
                    : 0;

                // Score de productivité (formule composite)
                var productivityScore = Math.Round(
                    (completionRate * 0.4m) +
                    (Math.Min(avgDistance / 10, 100) * 0.3m) +
                    (Math.Min(tripsPerDay * 20, 100) * 0.3m),
                    2
                );

                result.Add(new DriverStatisticsDto
                {
                    DriverId = driver.Id,
                    DriverName = driver.Name ?? "Non assigné",
                    LicenseNumber = driver.DrivingLicense ?? "N/A",
                    PhoneNumber = driver.PhoneNumber ?? "N/A",
                    TotalTrips = totalTrips,
                    TotalDistanceKm = totalDistance,
                    TotalDrivingHours = totalDuration,
                    AverageDistancePerTrip = avgDistance,
                    AverageDurationPerTrip = avgDuration,
                    CompletedTrips = completedTrips,
                    CancelledTrips = cancelledTrips,
                    CompletionRate = completionRate,
                    TotalStopTimeHours = stopTimeHours,
                    StopTimePercentage = stopTimePercentage,
                    ProductivityScore = productivityScore,
                    AverageTripsPerDay = tripsPerDay,
                    PeriodStart = minDate ?? DateTime.MinValue,
                    PeriodEnd = maxDate ?? DateTime.MaxValue
                });
            }

            // Trier par distance totale décroissante
            return result.OrderByDescending(d => d.TotalDistanceKm).ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetDriverStatisticsAsync: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
    }

    public async Task<DriverDetailedStatisticsDto?> GetDriverDetailedStatisticsAsync(StatisticsFilterDto filter)
    {
        if (!filter.DriverId.HasValue)
            return null;

        var driver = await _context.Set<Driver>()
            .FirstOrDefaultAsync(d => d.Id == filter.DriverId.Value);

        if (driver == null)
            return null;

        // Requête pour les trajets du chauffeur
        var query = _context.Trips
            .Where(t => t.DriverId == filter.DriverId.Value)
            .AsQueryable();

        if (filter.StartDate.HasValue)
            query = query.Where(t => t.EstimatedStartDate >= filter.StartDate.Value);
        if (filter.EndDate.HasValue)
            query = query.Where(t => t.EstimatedEndDate <= filter.EndDate.Value);

        var trips = await query.ToListAsync();

        if (!trips.Any())
        {
            return new DriverDetailedStatisticsDto
            {
                DriverId = driver.Id,
                DriverName = driver.Name,
                LicenseNumber = driver.DrivingLicense ?? "N/A",
                PhoneNumber = driver.PhoneNumber,
                Email = driver.Email,
                Status = driver.Status ?? "Unknown"
            };
        }

        // Statistiques globales
        var totalTrips = trips.Count;
        var totalDistance = trips.Sum(t => t.EstimatedDistance);
        var totalDuration = trips.Sum(t => t.EstimatedDuration);
        var completedTrips = trips.Count(t => t.TripStatus == TripStatus.Receipt);
        var cancelledTrips = trips.Count(t => t.TripStatus == TripStatus.Cancelled);
        var completionRate = totalTrips > 0 ? Math.Round((completedTrips * 100m) / totalTrips, 2) : 0;
        var stopTimeHours = Math.Round(totalDuration * 0.2m, 2);
        var stopTimePercentage = totalDuration > 0 ? Math.Round((stopTimeHours * 100m) / totalDuration, 2) : 0;
        var avgDistance = totalTrips > 0 ? Math.Round(totalDistance / totalTrips, 2) : 0;
        var avgDuration = totalTrips > 0 ? Math.Round(totalDuration / totalTrips, 2) : 0;

        var minDate = trips.Min(t => t.EstimatedStartDate);
        var maxDate = trips.Max(t => t.EstimatedEndDate);
        var totalDays = minDate.HasValue && maxDate.HasValue
            ? Math.Max(1m, (decimal)(maxDate.Value - minDate.Value).TotalDays)
            : 1m;
        var tripsPerDay = Math.Round((decimal)totalTrips / totalDays, 2);

        var productivityScore = Math.Round(
            (completionRate * 0.4m) +
            (Math.Min(avgDistance / 10, 100) * 0.3m) +
            (Math.Min(tripsPerDay * 20m, 100) * 0.3m),
            2
        );

        // Statistiques mensuelles
        var monthlyStats = trips
            .GroupBy(t => new { Year = t.EstimatedStartDate?.Year, Month = t.EstimatedStartDate?.Month })
            .Where(g => g.Key.Year.HasValue && g.Key.Month.HasValue)
            .Select(g => new MonthlyStatistics
            {
                Month = $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                TripCount = g.Count(),
                TotalDistance = g.Sum(t => t.EstimatedDistance),
                TotalHours = g.Sum(t => t.EstimatedDuration),
                CompletedCount = g.Count(t => t.TripStatus == TripStatus.Receipt),
                CompletionRate = g.Count() > 0
                    ? Math.Round((g.Count(t => t.TripStatus == TripStatus.Receipt) * 100m) / g.Count(), 2)
                    : 0
            })
            .OrderBy(m => m.Month)
            .ToList();

        // Distribution des statuts
        var statusDistribution = trips
            .GroupBy(t => t.TripStatus)
            .Select(g => new PieChartData
            {
                Label = g.Key.ToString(),
                Value = Math.Round((g.Count() * 100m) / totalTrips, 2),
                Count = g.Count(),
                Color = GetStatusColor(g.Key)
            })
            .ToList();

        // Trajets récents (10 derniers)
        var recentTrips = trips
            .OrderByDescending(t => t.EstimatedStartDate)
            .Take(10)
            .Select(t => new RecentTripSummary
            {
                TripId = t.Id,
                TripReference = t.TripReference ?? t.BookingId,
                StartDate = t.EstimatedStartDate,
                EndDate = t.EstimatedEndDate,
                Status = t.TripStatus.ToString(),
                Distance = t.EstimatedDistance,
                Duration = t.EstimatedDuration,
                Destination = t.Deliveries.LastOrDefault()?.DeliveryAddress ?? "N/A"
            })
            .ToList();

        // Indicateurs de performance
        var efficiencyScore = CalculateEfficiencyScore(avgDistance, avgDuration);
        var trend = CalculatePerformanceTrend(monthlyStats);

        return new DriverDetailedStatisticsDto
        {
            DriverId = driver.Id,
            DriverName = driver.Name,
            LicenseNumber = driver.DrivingLicense ?? "N/A",
            PhoneNumber = driver.PhoneNumber,
            Email = driver.Email,
            Status = driver.Status ?? "Unknown",
            Summary = new DriverPerformanceSummary
            {
                TotalTrips = totalTrips,
                TotalDistanceKm = totalDistance,
                TotalDrivingHours = totalDuration,
                CompletedTrips = completedTrips,
                CancelledTrips = cancelledTrips,
                CompletionRate = completionRate,
                TotalStopTimeHours = stopTimeHours,
                StopTimePercentage = stopTimePercentage,
                ProductivityScore = productivityScore,
                AverageTripsPerDay = tripsPerDay,
                AverageDistancePerTrip = avgDistance,
                AverageDurationPerTrip = avgDuration
            },
            MonthlyStats = monthlyStats,
            TripStatusDistribution = statusDistribution,
            RecentTrips = recentTrips,
            PerformanceIndicators = new PerformanceIndicators
            {
                EfficiencyScore = efficiencyScore,
                OnTimeDeliveryRate = completionRate, // Approximation
                CustomerSatisfactionScore = 0, // À implémenter si vous avez des évaluations
                IncidentCount = 0, // À implémenter si vous trackez les incidents
                FuelEfficiency = 0, // À implémenter si vous avez des données de carburant
                VehicleUtilizationRate = Math.Min((totalDuration / ((decimal)totalDays * 24)) * 100, 100),
                PerformanceTrend = trend.trend,
                TrendPercentage = trend.percentage
            }
        };
    }

    private string GetStatusColor(TripStatus status)
    {
        return status switch
        {
            TripStatus.Planned => "#4e73df",
            TripStatus.Accepted => "#1cc88a",
            TripStatus.LoadingInProgress => "#36b9cc",
            TripStatus.DeliveryInProgress => "#f6c23e",
            TripStatus.Receipt => "#20c9a6",
            TripStatus.Cancelled => "#e74a3b",
            _ => "#858796"
        };
    }

    private decimal CalculateEfficiencyScore(decimal avgDistance, decimal avgDuration)
    {
        // Vitesse moyenne = distance / durée
        var avgSpeed = avgDuration > 0 ? avgDistance / avgDuration : 0;
        
        // Score basé sur la vitesse moyenne (optimal: 60-80 km/h)
        decimal score = 0;
        if (avgSpeed >= 60 && avgSpeed <= 80)
            score = 100;
        else if (avgSpeed < 60)
            score = Math.Round((avgSpeed / 60) * 100, 2);
        else
            score = Math.Round(Math.Max(0, 100 - ((avgSpeed - 80) * 2)), 2);

        return score;
    }

    private (string trend, decimal percentage) CalculatePerformanceTrend(List<MonthlyStatistics> monthlyStats)
    {
        if (monthlyStats.Count < 2)
            return ("stable", 0);

        var lastMonth = monthlyStats.Last();
        var previousMonth = monthlyStats[monthlyStats.Count - 2];

        if (previousMonth.TripCount == 0)
            return ("stable", 0);

        var change = ((lastMonth.TripCount - previousMonth.TripCount) * 100m) / previousMonth.TripCount;

        string trend = change switch
        {
            > 5 => "improving",
            < -5 => "declining",
            _ => "stable"
        };

        return (trend, Math.Round(change, 2));
    }
}
