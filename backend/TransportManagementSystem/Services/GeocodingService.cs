using System.Text.Json;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Services;

/// <summary>
/// Service de géocodage utilisant Nominatim (OpenStreetMap)
/// Pour convertir les adresses en coordonnées GPS
/// </summary>
public interface IGeocodingService
{
    /// <summary>
    /// Géocoder une adresse (texte → coordonnées)
    /// </summary>
    Task<GeocodingResult?> GeocodeAsync(string address);

    /// <summary>
    /// Géocoder plusieurs adresses en parallèle
    /// </summary>
    Task<List<GeocodingResult>> GeocodeBatchAsync(List<string> addresses);

    /// <summary>
    /// Recherche d'adresses avec suggestions (pour autocomplete)
    /// </summary>
    Task<List<GeocodingSuggestion>> SearchSuggestionsAsync(string query, int limit = 5);

    /// <summary>
    /// Reverse geocoding (coordonnées → adresse)
    /// </summary>
    Task<GeocodingResult?> ReverseGeocodeAsync(double latitude, double longitude);
}

/// <summary>
/// Résultat d'un géocodage
/// </summary>
public class GeocodingResult
{
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? DisplayName { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public string? Postcode { get; set; }
    public double? Accuracy { get; set; } // Confiance (0-1)
    public string Source { get; set; } = "Nominatim";
    public DateTime GeocodedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Suggestion d'adresse pour l'autocomplete
/// </summary>
public class GeocodingSuggestion
{
    public string Address { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? DisplayName { get; set; }
    public string? Type { get; set; } // house, road, city, etc.
    public double? Importance { get; set; } // Score de pertinence
}

/// <summary>
/// Implémentation du service de géocodage avec Nominatim
/// </summary>
public class GeocodingService : IGeocodingService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GeocodingService> _logger;
    private readonly string _baseUrl = "https://nominatim.openstreetmap.org";
    private readonly string _userAgent = "TMS-App/1.0 (fida.khammassi@example.com)";

    // Cache pour éviter les requêtes répétées
    private readonly Dictionary<string, GeocodingResult> _cache = new();
    private readonly TimeSpan _cacheDuration = TimeSpan.FromHours(24);
    private readonly Dictionary<string, (GeocodingResult result, DateTime expiresAt)> _cacheWithExpiry = new();

    public GeocodingService(
        IHttpClientFactory httpClientFactory,
        ILogger<GeocodingService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<GeocodingResult?> GeocodeAsync(string address)
    {
        if (string.IsNullOrWhiteSpace(address))
            return null;

        // Vérifier le cache
        if (_cacheWithExpiry.TryGetValue(address.ToLower(), out var cached) && cached.expiresAt > DateTime.UtcNow)
        {
            _logger.LogDebug($"Cache hit for address: {address}");
            return cached.result;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", _userAgent);

            var url = $"{_baseUrl}/search?q={Uri.EscapeDataString(address)}&format=json&limit=1&addressdetails=1";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var results = JsonSerializer.Deserialize<List<JsonElement>>(json);

            if (results == null || results.Count == 0)
            {
                _logger.LogWarning($"No results found for address: {address}");
                return null;
            }

            var firstResult = results[0];
            var result = ParseGeocodingResult(firstResult, address);

            // Mettre en cache
            _cacheWithExpiry[address.ToLower()] = (result, DateTime.UtcNow.Add(_cacheDuration));

            _logger.LogInformation($"Geocoded '{address}' → ({result.Latitude}, {result.Longitude})");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error geocoding address: {address}");
            return null;
        }
    }

    public async Task<List<GeocodingResult>> GeocodeBatchAsync(List<string> addresses)
    {
        var results = new List<GeocodingResult>();

        // Traiter par lots de 5 pour respecter rate limiting Nominatim (1 req/sec)
        for (int i = 0; i < addresses.Count; i += 5)
        {
            var batch = addresses.Skip(i).Take(5).ToList();
            var tasks = batch.Select(a => GeocodeAsync(a));
            var batchResults = await Task.WhenAll(tasks);
            results.AddRange(batchResults.Where(r => r != null)!);

            // Attendre 1 seconde entre les lots (rate limiting)
            if (i + 5 < addresses.Count)
                await Task.Delay(1000);
        }

        return results;
    }

    public async Task<List<GeocodingSuggestion>> SearchSuggestionsAsync(string query, int limit = 5)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 3)
            return new List<GeocodingSuggestion>();

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", _userAgent);

            var url = $"{_baseUrl}/search?q={Uri.EscapeDataString(query)}&format=json&limit={limit}&addressdetails=1";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var results = JsonSerializer.Deserialize<List<JsonElement>>(json);

            if (results == null)
                return new List<GeocodingSuggestion>();

            var suggestions = results.Select(r => ParseSuggestion(r)).ToList();
            _logger.LogDebug($"Found {suggestions.Count} suggestions for '{query}'");
            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error searching suggestions for: {query}");
            return new List<GeocodingSuggestion>();
        }
    }

    public async Task<GeocodingResult?> ReverseGeocodeAsync(double latitude, double longitude)
    {
        try
        {
            var cacheKey = $"{latitude:F6},{longitude:F6}";

            // Vérifier le cache
            if (_cacheWithExpiry.TryGetValue(cacheKey, out var cached) && cached.expiresAt > DateTime.UtcNow)
            {
                return cached.result;
            }

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", _userAgent);

            var url = $"{_baseUrl}/reverse?lat={latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}&lon={longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}&format=json&addressdetails=1";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var element = JsonSerializer.Deserialize<JsonElement>(json);

            if (!element.TryGetProperty("display_name", out var displayNameProp))
                return null;

            var result = new GeocodingResult
            {
                Address = displayNameProp.GetString() ?? "",
                Latitude = latitude,
                Longitude = longitude,
                DisplayName = displayNameProp.GetString(),
                Source = "Nominatim Reverse",
                GeocodedAt = DateTime.UtcNow
            };

            // Extraire ville/pays si disponible
            if (element.TryGetProperty("address", out var addressProp))
            {
                if (addressProp.TryGetProperty("city", out var cityProp))
                    result.City = cityProp.GetString();
                if (addressProp.TryGetProperty("country", out var countryProp))
                    result.Country = countryProp.GetString();
                if (addressProp.TryGetProperty("postcode", out var postcodeProp))
                    result.Postcode = postcodeProp.GetString();
            }

            // Mettre en cache
            _cacheWithExpiry[cacheKey] = (result, DateTime.UtcNow.Add(_cacheDuration));

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error reverse geocoding: {latitude}, {longitude}");
            return null;
        }
    }

    private GeocodingResult ParseGeocodingResult(JsonElement element, string originalAddress)
    {
        var result = new GeocodingResult
        {
            Address = originalAddress,
            Source = "Nominatim"
        };

        if (element.TryGetProperty("lat", out var latProp))
            result.Latitude = double.Parse(latProp.GetString() ?? "0", System.Globalization.CultureInfo.InvariantCulture);

        if (element.TryGetProperty("lon", out var lonProp))
            result.Longitude = double.Parse(lonProp.GetString() ?? "0", System.Globalization.CultureInfo.InvariantCulture);

        if (element.TryGetProperty("display_name", out var displayNameProp))
            result.DisplayName = displayNameProp.GetString();

        // Extraire détails de l'adresse
        if (element.TryGetProperty("address", out var addressProp))
        {
            if (addressProp.TryGetProperty("city", out var cityProp))
                result.City = cityProp.GetString();
            if (addressProp.TryGetProperty("country", out var countryProp))
                result.Country = countryProp.GetString();
            if (addressProp.TryGetProperty("postcode", out var postcodeProp))
                result.Postcode = postcodeProp.GetString();
        }

        return result;
    }

    private GeocodingSuggestion ParseSuggestion(JsonElement element)
    {
        var suggestion = new GeocodingSuggestion();

        if (element.TryGetProperty("display_name", out var displayNameProp))
            suggestion.DisplayName = displayNameProp.GetString();

        if (element.TryGetProperty("lat", out var latProp))
            suggestion.Latitude = double.Parse(latProp.GetString() ?? "0", System.Globalization.CultureInfo.InvariantCulture);

        if (element.TryGetProperty("lon", out var lonProp))
            suggestion.Longitude = double.Parse(lonProp.GetString() ?? "0", System.Globalization.CultureInfo.InvariantCulture);

        if (element.TryGetProperty("type", out var typeProp))
            suggestion.Type = typeProp.GetString();

        if (element.TryGetProperty("importance", out var importanceProp))
            suggestion.Importance = importanceProp.GetDouble();

        suggestion.Address = suggestion.DisplayName ?? "";

        return suggestion;
    }
}
