using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WeatherController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _apiKey = "aacff7d0d86c768bc724481f653d95c2";
    private readonly ApplicationDbContext _dbContext;

    public WeatherController(IHttpClientFactory httpClientFactory, ApplicationDbContext dbContext)
    {
        _httpClientFactory = httpClientFactory;
        _dbContext = dbContext;
    }

    // ==================== EXISTING ENDPOINTS ====================

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { message = "City query parameter is required" });

        return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/weather?q={q}&appid={_apiKey}&units=metric&lang=fr");
    }

    [HttpGet("coords")]
    public async Task<IActionResult> GetByCoords([FromQuery] double lat, [FromQuery] double lon)
    {
        if (lat == 0 || lon == 0)
            return BadRequest(new { message = "Latitude and longitude are required" });

        return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={_apiKey}&units=metric&lang=fr");
    }

    [HttpGet("forecast")]
    public async Task<IActionResult> GetForecast([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { message = "City query parameter is required" });

        return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/forecast?q={q}&appid={_apiKey}&units=metric&lang=fr");
    }

    // ==================== NEW ENDPOINTS WITH LOCATION ID ====================

    /// <summary>
    /// Get current weather by location ID
    /// </summary>
    [HttpGet("location/{locationId}")]
    public async Task<IActionResult> GetWeatherByLocation(int locationId)
    {
        var location = await _dbContext.Locations
            .Include(l => l.LocationGeographicalEntities)
                .ThenInclude(lg => lg.GeographicalEntity)
            .FirstOrDefaultAsync(l => l.Id == locationId);

        if (location == null)
            return NotFound(new { message = $"Location with ID {locationId} not found" });

        var coordinates = await GetCoordinatesFromLocation(location);

        if (coordinates != null)
        {
            // Convert double to string with invariant culture to avoid decimal/comma issues
            var latStr = coordinates.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var lonStr = coordinates.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
            return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/weather?lat={latStr}&lon={lonStr}&appid={_apiKey}&units=metric&lang=fr");
        }

        // Fallback to location name
        return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/weather?q={Uri.EscapeDataString(location.Name)}&appid={_apiKey}&units=metric&lang=fr");
    }

    /// <summary>
    /// Get weather forecast by location ID
    /// </summary>
    [HttpGet("location/{locationId}/forecast")]
    public async Task<IActionResult> GetForecastByLocation(int locationId)
    {
        var location = await _dbContext.Locations
            .Include(l => l.LocationGeographicalEntities)
                .ThenInclude(lg => lg.GeographicalEntity)
            .FirstOrDefaultAsync(l => l.Id == locationId);

        if (location == null)
            return NotFound(new { message = $"Location with ID {locationId} not found" });

        var coordinates = await GetCoordinatesFromLocation(location);

        if (coordinates != null)
        {
            var latStr = coordinates.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var lonStr = coordinates.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
            return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/forecast?lat={latStr}&lon={lonStr}&appid={_apiKey}&units=metric&lang=fr");
        }

        // Fallback to location name
        return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/forecast?q={Uri.EscapeDataString(location.Name)}&appid={_apiKey}&units=metric&lang=fr");
    }

    /// <summary>
    /// Get weather for both start and end locations in one request
    /// </summary>
    [HttpGet("trip")]
    public async Task<IActionResult> GetWeatherForTrip([FromQuery] int startLocationId, [FromQuery] int endLocationId)
    {
        var startLocation = await _dbContext.Locations
            .Include(l => l.LocationGeographicalEntities)
                .ThenInclude(lg => lg.GeographicalEntity)
            .FirstOrDefaultAsync(l => l.Id == startLocationId);

        var endLocation = await _dbContext.Locations
            .Include(l => l.LocationGeographicalEntities)
                .ThenInclude(lg => lg.GeographicalEntity)
            .FirstOrDefaultAsync(l => l.Id == endLocationId);

        if (startLocation == null)
            return NotFound(new { message = $"Start location with ID {startLocationId} not found" });

        if (endLocation == null)
            return NotFound(new { message = $"End location with ID {endLocationId} not found" });

        var startWeather = await GetWeatherDataForLocation(startLocation);
        var endWeather = await GetWeatherDataForLocation(endLocation);

        var result = new
        {
            Start = startWeather,
            End = endWeather
        };

        return Ok(result);
    }

    // ==================== HELPER METHODS ====================

    /// <summary>
    /// Get coordinates from location's associated geographical entities
    /// </summary>
    private async Task<GeoPoint?> GetCoordinatesFromLocation(Location location)
    {
        if (location.LocationGeographicalEntities == null || !location.LocationGeographicalEntities.Any())
            return null;

        // Get the first active geographical entity with coordinates
        var geoEntity = location.LocationGeographicalEntities
            .Select(lg => lg.GeographicalEntity)
            .FirstOrDefault(ge => ge != null && ge.IsActive && ge.Latitude != null && ge.Longitude != null);

        if (geoEntity == null)
            return null;

        // Safe access to nullable value types
        return new GeoPoint(geoEntity.Latitude.Value, geoEntity.Longitude.Value);
    }

    /// <summary>
    /// Get weather data for a single location
    /// </summary>
    private async Task<object?> GetWeatherDataForLocation(Location location)
    {
        var coordinates = await GetCoordinatesFromLocation(location);
        string url;

        if (coordinates != null)
        {
            var latStr = coordinates.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var lonStr = coordinates.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture);
            url = $"https://api.openweathermap.org/data/2.5/weather?lat={latStr}&lon={lonStr}&appid={_apiKey}&units=metric&lang=fr";
        }
        else
        {
            url = $"https://api.openweathermap.org/data/2.5/weather?q={Uri.EscapeDataString(location.Name)}&appid={_apiKey}&units=metric&lang=fr";
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                return JsonSerializer.Deserialize<JsonElement>(content);
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Call OpenWeather API and return response
    /// </summary>
    private async Task<IActionResult> CallOpenWeather(string url)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, JsonSerializer.Deserialize<JsonElement>(content));
            }

            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error", details = ex.Message });
        }
    }
}

/// <summary>
/// Simple class to hold geographical coordinates
/// </summary>
public class GeoPoint
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public GeoPoint() { }

    public GeoPoint(double latitude, double longitude)
    {
        Latitude = latitude;
        Longitude = longitude;
    }

    public bool HasCoordinates => Latitude != 0 && Longitude != 0;
}