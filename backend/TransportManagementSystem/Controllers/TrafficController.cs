using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrafficController : ControllerBase
    {
        private readonly AiMicroserviceClient _aiClient;
        private readonly ILogger<TrafficController> _logger;

        public TrafficController(
            AiMicroserviceClient aiClient,
            ILogger<TrafficController> logger)
        {
            _aiClient = aiClient;
            _logger = logger;
        }

        /// <summary>
        /// Récupère la heatmap du trafic pour une zone donnée.
        /// </summary>
        [HttpGet("heatmap")]
        public async Task<IActionResult> GetHeatmap(
            [FromQuery] double lat,
            [FromQuery] double lon,
            [FromQuery] int radius = 5000)
        {
            try
            {
                var heatmapData = await _aiClient.GetHeatmapAsync(lat, lon, radius);

                if (heatmapData == null)
                {
                    return StatusCode(502, new { error = "Impossible de récupérer les données du microservice IA" });
                }

                return Ok(heatmapData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération de la heatmap");
                return StatusCode(500, new { error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Signale un incident de trafic.
        /// </summary>
        [HttpPost("incident")]
        public async Task<IActionResult> ReportIncident([FromBody] IncidentRequest request)
        {
            try
            {
                // TODO: Enregistrer l'incident en base de données
                // TODO: Broadcast via SignalR aux clients de la zone

                _logger.LogInformation("Incident signalé: type={Type}, rue={Rue}", 
                    request.Type, request.Rue);

                return Ok(new { success = true, message = "Incident enregistré" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors du signalement d'incident");
                return StatusCode(500, new { error = "Erreur interne du serveur" });
            }
        }
    }

    public class IncidentRequest
    {
        public string Type { get; set; } = string.Empty;
        public string Rue { get; set; } = string.Empty;
        public double? Lat { get; set; }
        public double? Lon { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ZoneId { get; set; } = string.Empty;
    }
}
