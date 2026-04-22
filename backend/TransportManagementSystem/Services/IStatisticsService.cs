using TransportManagementSystem.DTOs;

namespace TransportManagementSystem.Services;

public interface IStatisticsService
{
    Task<TripStatisticsDto> GetTripStatisticsAsync(StatisticsFilterDto filter);
    Task<List<PieChartData>> GetTripStatusDistributionAsync(StatisticsFilterDto filter);
    Task<List<PieChartData>> GetTruckUtilizationAsync(StatisticsFilterDto filter);
    Task<List<PieChartData>> GetOrdersByTypeAsync(StatisticsFilterDto filter);
    
    // Nouvelles méthodes pour les statistiques par chauffeur
    Task<List<DriverStatisticsDto>> GetDriverStatisticsAsync(StatisticsFilterDto filter);
    Task<DriverDetailedStatisticsDto?> GetDriverDetailedStatisticsAsync(StatisticsFilterDto filter);
}
