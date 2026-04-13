using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendController : ControllerBase
    {
        private readonly AiMicroserviceClient _aiClient;
        private readonly ILogger<RecommendController> _logger;

        public RecommendController(
            AiMicroserviceClient aiClient,
            ILogger<RecommendController> logger)
        {
            _aiClient = aiClient;
            _logger = logger;
        }

        /// <summary>
        /// Récupère les recommandations chauffeurs/camions pour une livraison.
        /// </summary>
        [HttpPost("assignment")]
        public async Task<IActionResult> GetAssignment([FromBody] AssignmentRequest request)
        {
            try
            {
                var recommendation = await _aiClient.GetRecommendationAsync(request);

                if (recommendation == null)
                {
                    return StatusCode(502, new { error = "Impossible de récupérer les recommandations du microservice IA" });
                }

                return Ok(recommendation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des recommandations");
                return StatusCode(500, new { error = "Erreur interne du serveur" });
            }
        }
    }

    public class AssignmentRequest
    {
        public LivraisonRequest Livraison { get; set; } = new();
        public List<ChauffeurDisponible> ChauffeursDisponibles { get; set; } = new();
        public List<CamionDisponible> CamionsDisponibles { get; set; } = new();
    }

    public class LivraisonRequest
    {
        public string Id { get; set; } = string.Empty;
        public string RueDepart { get; set; } = string.Empty;
        public string RueArrivee { get; set; } = string.Empty;
        public double? PoidsTotalKg { get; set; }
        public double? VolumeM3 { get; set; }
        public bool NecessiteRefrigeration { get; set; }
        public double? DistanceKm { get; set; }
    }

    public class ChauffeurDisponible
    {
        public string Id { get; set; } = string.Empty;
        public string Nom { get; set; } = string.Empty;
        public double? Lat { get; set; }
        public double? Lon { get; set; }
        public double? HeuresRestantes { get; set; }
        public int LivraisonsEnCours { get; set; }
    }

    public class CamionDisponible
    {
        public string Id { get; set; } = string.Empty;
        public string Immatriculation { get; set; } = string.Empty;
        public double? ChargeMaxKg { get; set; }
        public double? VolumeMaxM3 { get; set; }
        public bool EstFrigorifique { get; set; }
        public bool Disponible { get; set; } = true;
        public bool ControleTechniqueValide { get; set; } = true;
    }
}
