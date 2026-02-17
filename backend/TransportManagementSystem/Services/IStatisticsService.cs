using TransportManagementSystem.DTOs;

public interface IStatisticsService
{
    Task<TripStatisticsDto> GetTripStatisticsAsync(StatisticsFilterDto filter);
    Task<List<PieChartData>> GetTripStatusDistributionAsync(StatisticsFilterDto filter);
    Task<List<PieChartData>> GetTruckUtilizationAsync(StatisticsFilterDto filter);
    Task<List<PieChartData>> GetOrdersByTypeAsync(StatisticsFilterDto filter);
}
