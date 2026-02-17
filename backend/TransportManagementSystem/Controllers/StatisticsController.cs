using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.DTOs;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _statisticsService;

    public StatisticsController(IStatisticsService statisticsService)
    {
        _statisticsService = statisticsService;
    }

    [HttpGet("trip-statistics")]
    public async Task<ActionResult<TripStatisticsDto>> GetTripStatistics(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? truckId,
        [FromQuery] int? driverId)
    {
        var filter = new StatisticsFilterDto
        {
            StartDate = startDate,
            EndDate = endDate,
            TruckId = truckId,
            DriverId = driverId
        };

        var statistics = await _statisticsService.GetTripStatisticsAsync(filter);
        return Ok(statistics);
    }

    [HttpGet("trip-status-distribution")]
    public async Task<ActionResult<List<PieChartData>>> GetTripStatusDistribution(
        [FromQuery] StatisticsFilterDto filter)
    {
        var data = await _statisticsService.GetTripStatusDistributionAsync(filter);
        return Ok(data);
    }

    [HttpGet("truck-utilization")]
    public async Task<ActionResult<List<PieChartData>>> GetTruckUtilization(
        [FromQuery] StatisticsFilterDto filter)
    {
        var data = await _statisticsService.GetTruckUtilizationAsync(filter);
        return Ok(data);
    }

    [HttpGet("orders-by-type")]
    public async Task<ActionResult<List<PieChartData>>> GetOrdersByType(
        [FromQuery] StatisticsFilterDto filter)
    {
        var data = await _statisticsService.GetOrdersByTypeAsync(filter);
        return Ok(data);
    }
}