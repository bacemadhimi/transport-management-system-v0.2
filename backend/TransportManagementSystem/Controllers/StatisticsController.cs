using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.DTOs;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _statisticsService;

    public StatisticsController(IStatisticsService statisticsService)
    {
        _statisticsService = statisticsService;
    }

    [HttpGet("trip-statistics")]
    public async Task<ActionResult<TripStatisticsDto>> GetTripStatistics(
        [FromQuery] StatisticsFilterDto filter)
    {
        var statistics = await _statisticsService.GetTripStatisticsAsync(filter);
        return Ok(statistics);
    }

    [HttpGet("status-distribution")]
    public async Task<ActionResult<List<PieChartData>>> GetStatusDistribution(
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

    [HttpGet("driver-statistics")]
    public async Task<ActionResult<List<DriverStatisticsDto>>> GetDriverStatistics(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var filter = new StatisticsFilterDto
            {
                StartDate = startDate,
                EndDate = endDate
            };

            var statistics = await _statisticsService.GetDriverStatisticsAsync(filter);
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching driver statistics", error = ex.Message });
        }
    }

    [HttpGet("driver-statistics/{driverId}")]
    public async Task<ActionResult<DriverDetailedStatisticsDto>> GetDriverDetailedStatistics(
        int driverId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var filter = new StatisticsFilterDto
            {
                DriverId = driverId,
                StartDate = startDate,
                EndDate = endDate
            };

            var statistics = await _statisticsService.GetDriverDetailedStatisticsAsync(filter);

            if (statistics == null)
            {
                return NotFound(new { message = $"Driver with ID {driverId} not found" });
            }

            return Ok(statistics);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching driver detailed statistics", error = ex.Message });
        }
    }
}
