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
            DeliveryByType = await GetOrdersByTypeAsync(filter)
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
}