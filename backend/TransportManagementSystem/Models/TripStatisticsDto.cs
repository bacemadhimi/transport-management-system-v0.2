namespace TransportManagementSystem.DTOs;

public class PieChartData
{
    public string Label { get; set; }
    public decimal Value { get; set; }
    public string Color { get; set; }
    public int Count { get; set; }
}

public class TripStatisticsDto
{
    public List<PieChartData> StatusDistribution { get; set; } = new();
    public List<PieChartData> TruckUtilization { get; set; } = new();
    public List<PieChartData> DeliveryByType { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class StatisticsFilterDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? TruckId { get; set; }
    public int? DriverId { get; set; }
}