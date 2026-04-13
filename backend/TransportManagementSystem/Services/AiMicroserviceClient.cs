using System.Text;
using System.Text.Json;
using TransportManagementSystem.DTOs;

namespace TransportManagementSystem.Services
{
    /// <summary>
    /// Client HTTP pour communiquer avec le microservice IA Python FastAPI.
    /// </summary>
    public class AiMicroserviceClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AiMicroserviceClient> _logger;
        private readonly string _baseUrl;
        private readonly int _timeoutSeconds;

        public AiMicroserviceClient(
            HttpClient httpClient,
            ILogger<AiMicroserviceClient> logger,
            IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;

            // Lire configuration depuis appsettings.json
            _baseUrl = configuration["AiMicroservice:BaseUrl"] ?? "http://localhost:8000";
            _timeoutSeconds = int.Parse(configuration["AiMicroservice:TimeoutSeconds"] ?? "35");

            _httpClient.BaseAddress = new Uri(_baseUrl);
            _httpClient.Timeout = TimeSpan.FromSeconds(_timeoutSeconds);
        }

        /// <summary>
        /// Envoie une requête de chat au microservice IA.
        /// </summary>
        public async Task<AiChatResponse?> SendChatMessageAsync(AiChatRequest request, CancellationToken ct = default)
        {
            try
            {
                _logger.LogInformation("Envoi requête chat au microservice IA: chauffeur={ChauffeurId}", request.ChauffeurId);

                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/chat/message", content, ct);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var chatResponse = JsonSerializer.Deserialize<AiChatResponse>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                _logger.LogInformation("Réponse chat reçue: duree={DureeMs}ms, confiance={Confiance}", 
                    chatResponse?.DureeMs, chatResponse?.Confiance);

                return chatResponse;
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
            {
                _logger.LogError(ex, "Timeout lors de l'appel au microservice IA (chat)");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (chat)");
                return null;
            }
        }

        /// <summary>
        /// Récupère la heatmap du trafic pour une zone donnée.
        /// </summary>
        public async Task<Dictionary<string, object>?> GetHeatmapAsync(double lat, double lon, int radius = 5000, CancellationToken ct = default)
        {
            try
            {
                var url = $"/traffic/heatmap?lat={lat}&lon={lon}&radius={radius}";
                var response = await _httpClient.GetAsync(url, ct);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var heatmapData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return heatmapData;
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
            {
                _logger.LogError(ex, "Timeout lors de l'appel au microservice IA (heatmap)");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (heatmap)");
                return null;
            }
        }

        /// <summary>
        /// Récupère les recommandations chauffeurs/camions.
        /// </summary>
        public async Task<Dictionary<string, object>?> GetRecommendationAsync(object request, CancellationToken ct = default)
        {
            try
            {
                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/recommend/assignment", content, ct);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var recommendationData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return recommendationData;
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
            {
                _logger.LogError(ex, "Timeout lors de l'appel au microservice IA (recommendation)");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (recommendation)");
                return null;
            }
        }

        /// <summary>
        /// Vérifie la présence d'anomalies dans la télémétrie.
        /// </summary>
        public async Task<Dictionary<string, object>?> CheckAnomalyAsync(object telemetrie, CancellationToken ct = default)
        {
            try
            {
                var json = JsonSerializer.Serialize(telemetrie);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/anomaly/check", content, ct);
                response.EnsureSuccessStatusCode();

                var responseJson = await response.Content.ReadAsStringAsync(ct);
                var anomalyData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return anomalyData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel au microservice IA (anomaly check)");
                return null;
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
