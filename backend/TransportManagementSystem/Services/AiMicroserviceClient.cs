using System.Text;
using System.Text.Json;
using TransportManagementSystem.Models.AI;

namespace TransportManagementSystem.Services
{
    /// <summary>
    /// Client HTTP pour communiquer avec le microservice IA Python FastAPI (DeliveryBrain v2.0).
    /// Sécurisé par header X-AI-Secret — jamais exposé directement sur internet.
    /// </summary>
    public class AiMicroserviceClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AiMicroserviceClient> _logger;
        private readonly string _baseUrl;
        private readonly string _secret;

        public AiMicroserviceClient(
            HttpClient httpClient,
            ILogger<AiMicroserviceClient> logger,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;

            // Lire configuration depuis appsettings.json (section AiService)
            _baseUrl = configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
            _secret = configuration["AiService:Secret"] ?? "changeme";

            _httpClient.BaseAddress = new Uri(_baseUrl);
            _httpClient.Timeout = TimeSpan.FromSeconds(35);
            
            // Header de sécurité: seul le backend .NET peut appeler le microservice
            _httpClient.DefaultRequestHeaders.Add("X-AI-Secret", _secret);
        }

        /// <summary>
        /// Envoie une requête de chat enrichie au microservice IA DeliveryBrain v2.0.
        /// Retourne null si le service est indisponible (fallback vers Ollama direct).
        /// </summary>
        public async Task<ChatAiResponse?> GetChatResponseAsync(ChatAiRequest request, CancellationToken ct = default)
        {
            try
            {
                _logger.LogInformation("Envoi requête chat DeliveryBrain v2: chauffeur={DriverId}", request.DriverId);

                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/chat", content, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("AiMicroservice returned {Status}, fallback to Ollama", response.StatusCode);
                    return null;
                }

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var chatResponse = JsonSerializer.Deserialize<ChatAiResponse>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                _logger.LogInformation("Réponse chat DeliveryBrain: hasAnomaly={HasAnomaly}, optimization={Optimization}",
                    chatResponse?.HasAnomaly, chatResponse?.Optimization != null);

                return chatResponse;
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
            {
                _logger.LogError(ex, "Timeout lors de l'appel au microservice IA (chat v2)");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (chat v2) — fallback to Ollama");
                return null;
            }
        }

        /// <summary>
        /// Récupère la heatmap du trafic et la météo pour une zone donnée.
        /// </summary>
        public async Task<Dictionary<string, object>?> GetTrafficAsync(double lat, double lon, CancellationToken ct = default)
        {
            try
            {
                var url = $"/traffic?lat={lat}&lon={lon}";
                var response = await _httpClient.GetAsync(url, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Traffic service returned {Status}", response.StatusCode);
                    return null;
                }

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var heatmapData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return heatmapData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (traffic)");
                return null;
            }
        }

        /// <summary>
        /// Récupère les recommandations chauffeurs/camions pour une livraison.
        /// </summary>
        public async Task<Dictionary<string, object>?> GetRecommendationAsync(int deliveryId, CancellationToken ct = default)
        {
            try
            {
                var json = JsonSerializer.Serialize(new { delivery_id = deliveryId });
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/recommend", content, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Recommendation service returned {Status}", response.StatusCode);
                    return null;
                }

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var recommendationData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return recommendationData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (recommendation)");
                return null;
            }
        }

        /// <summary>
        /// Vérifie la présence d'anomalies dans la télémétrie GPS.
        /// </summary>
        public async Task<AnomalyResult?> CheckAnomalyAsync(int driverId, List<GpsPointDto> points, CancellationToken ct = default)
        {
            try
            {
                var request = new { driver_id = driverId, points = points };
                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/anomaly", content, ct);

                if (!response.IsSuccessStatusCode)
                {
                    return new AnomalyResult { IsAnomaly = false };
                }

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var anomalyData = JsonSerializer.Deserialize<AnomalyResult>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return anomalyData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (anomaly check)");
                return new AnomalyResult { IsAnomaly = false };
            }
        }

        /// <summary>
        /// Soumet un feedback chauffeur pour ajuster les poids RAG.
        /// </summary>
        public async Task<bool> SubmitFeedbackAsync(int driverId, string question, int score, CancellationToken ct = default)
        {
            try
            {
                var json = JsonSerializer.Serialize(new { driver_id = driverId, question, score });
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/feedback", content, ct);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'envoi du feedback");
                return false;
            }
        }

        /// <summary>
        /// Vérifie la santé du microservice IA.
        /// </summary>
        public async Task<bool> HealthCheckAsync(CancellationToken ct = default)
        {
            try
            {
                var response = await _httpClient.GetAsync("/health", ct);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }
    }
}
