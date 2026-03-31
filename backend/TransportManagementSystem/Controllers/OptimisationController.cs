using Microsoft.AspNetCore.Mvc;
<<<<<<< HEAD
using TransportManagementSystem.Service;
using TransportManagementSystem.Models;
=======
using TransportManagementSystem.Models;
using TransportManagementSystem.Services;
>>>>>>> dev

namespace TransportManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OptimisationController : ControllerBase
    {
        private readonly IOptimisationService _optimisationService;
        private readonly ILogger<OptimisationController> _logger;

        public OptimisationController(
            IOptimisationService optimisationService,
            ILogger<OptimisationController> logger)
        {
            _optimisationService = optimisationService;
            _logger = logger;
        }

        /// <summary>
        /// Optimiser un trajet
        /// </summary>
        [HttpPost("optimize")]
        public async Task<IActionResult> OptimizeRoute([FromBody] OptimizeRouteDto dto)
        {
            try
            {
                if (dto.Points == null || dto.Points.Count < 2)
                    return BadRequest(new { message = "Au moins 2 points sont requis" });

                var result = await _optimisationService.OptimizeRouteAsync(dto.TripId, dto.Points, dto.VehicleCount);

                return Ok(new
                {
                    message = "Trajet optimis�",
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error optimizing route: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de l'optimisation" });
            }
        }

        /// <summary>
        /// Obtenir le r�sultat d'optimisation pour un trajet
        /// </summary>
        [HttpGet("result/{tripId}")]
        public async Task<IActionResult> GetOptimisationResult(int tripId)
        {
            try
            {
                var result = await _optimisationService.GetOptimisationResultAsync(tripId);
                if (result == null)
                    return NotFound(new { message = "Aucun r�sultat d'optimisation trouv�" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting optimisation result: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la r�cup�ration" });
            }
        }

        /// <summary>
        /// Calculer le temps estim� pour une distance
        /// </summary>
        [HttpPost("estimate-time")]
        public async Task<IActionResult> EstimateTime([FromBody] EstimateTimeDto dto)
        {
            try
            {
                var timeInMinutes = await _optimisationService.CalculateEstimatedTimeAsync(dto.Distance);

                return Ok(new
                {
                    distance = dto.Distance,
                    timeInMinutes = Math.Round(timeInMinutes, 2),
                    timeInHours = Math.Round(timeInMinutes / 60, 2)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error estimating time: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors du calcul" });
            }
        }
    }

}
