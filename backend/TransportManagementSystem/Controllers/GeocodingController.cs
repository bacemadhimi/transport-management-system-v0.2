using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GeocodingController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<GeocodingController> _logger;

    public GeocodingController(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        ILogger<GeocodingController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Recherche d'adresses via Nominatim (proxy backend)
    /// GET /api/geocoding/search?q=tunis&limit=5
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 5)
    {
        _logger.LogInformation("🔍 Geocoding search request: q={Query}, limit={Limit}", q, limit);

        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
        {
            return BadRequest(new { error = "Query must be at least 2 characters" });
        }

        // Check cache first (24h cache)
        var cacheKey = $"geocode_search_{q.ToLowerInvariant()}_{limit}";
        if (_cache.TryGetValue(cacheKey, out var cachedResult))
        {
            _logger.LogDebug("Cache hit for search: {Query}", q);
            return Ok(cachedResult);
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("User-Agent", "TMS-App/1.0");
            client.Timeout = TimeSpan.FromSeconds(10);

            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(q)}&format=json&limit={limit}&addressdetails=1&countrycodes=tn&accept-language=fr";
            _logger.LogInformation("🌐 Calling Nominatim: {Url}", url);

            var response = await client.GetAsync(url);
            _logger.LogInformation("📥 Nominatim response status: {Status}", response.StatusCode);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("⚠️ Nominatim search failed with status: {Status}", response.StatusCode);
                return StatusCode(502, new { error = "Geocoding service unavailable", status = response.StatusCode.ToString() });
            }

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("📦 Nominatim response length: {Length} chars", content.Length);

            var results = JsonSerializer.Deserialize<List<JsonElement>>(content);

            _logger.LogInformation("✅ Returning {Count} results for query: {Query}", results?.Count ?? 0, q);

            // Cache for 24 hours
            _cache.Set(cacheKey, results, TimeSpan.FromHours(24));

            return Ok(results);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "❌ HTTP error calling Nominatim: {Message}", ex.Message);
            return StatusCode(502, new { error = "Network error calling Nominatim", details = ex.Message });
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "⏰ Timeout calling Nominatim");
            return StatusCode(504, new { error = "Geocoding service timeout" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Unexpected error in geocoding search");
            return StatusCode(500, new { error = "Internal geocoding error", details = ex.Message });
        }
    }

    /// <summary>
    /// Géocodage d'une adresse (retourne 1 résultat)
    /// GET /api/geocoding/geocode?address=tunis
    /// </summary>
    [HttpGet("geocode")]
    public async Task<IActionResult> Geocode([FromQuery] string address)
    {
        _logger.LogInformation("🔍 Geocode request: address={Address}", address);

        if (string.IsNullOrWhiteSpace(address) || address.Length < 2)
        {
            return BadRequest(new { error = "Address must be at least 2 characters" });
        }

        var cacheKey = $"geocode_{address.ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out var cachedResult))
        {
            _logger.LogDebug("Cache hit for geocode: {Address}", address);
            return Ok(cachedResult);
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("User-Agent", "TMS-App/1.0");
            client.Timeout = TimeSpan.FromSeconds(10);

            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(address)}&format=json&limit=1&addressdetails=1&countrycodes=tn&accept-language=fr";
            _logger.LogInformation("🌐 Calling Nominatim: {Url}", url);

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("⚠️ Nominatim geocode failed with status: {Status}", response.StatusCode);
                return StatusCode(502, new { error = "Geocoding service unavailable" });
            }

            var content = await response.Content.ReadAsStringAsync();
            var results = JsonSerializer.Deserialize<List<JsonElement>>(content);

            var result = results?.Count > 0 ? results[0] : (object)new { };

            _logger.LogInformation("✅ Returning geocode result for: {Address}", address);

            _cache.Set(cacheKey, result, TimeSpan.FromHours(24));

            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "❌ HTTP error calling Nominatim geocode");
            return StatusCode(502, new { error = "Network error", details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Unexpected error in geocoding");
            return StatusCode(500, new { error = "Internal geocoding error", details = ex.Message });
        }
    }

    /// <summary>
    /// Reverse geocoding (coordonnées → adresse)
    /// GET /api/geocoding/reverse?lat=36.8&lon=10.18
    /// </summary>
    [HttpGet("reverse")]
    public async Task<IActionResult> Reverse([FromQuery] double lat, [FromQuery] double lon)
    {
        _logger.LogInformation("🔍 Reverse geocode request: lat={Lat}, lon={Lon}", lat, lon);

        var cacheKey = $"geocode_reverse_{lat:F6}_{lon:F6}";
        if (_cache.TryGetValue(cacheKey, out var cachedResult))
        {
            _logger.LogDebug("Cache hit for reverse: {Lat},{Lon}", lat, lon);
            return Ok(cachedResult);
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("User-Agent", "TMS-App/1.0");
            client.Timeout = TimeSpan.FromSeconds(10);

            var url = $"https://nominatim.openstreetmap.org/reverse?lat={lat:F6}&lon={lon:F6}&format=json&addressdetails=1&accept-language=fr";

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(502, new { error = "Geocoding service unavailable" });
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);

            _cache.Set(cacheKey, result, TimeSpan.FromHours(24));

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in reverse geocoding");
            return StatusCode(500, new { error = "Internal geocoding error", details = ex.Message });
        }
    }
}
