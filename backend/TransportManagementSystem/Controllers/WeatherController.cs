using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using TransportManagementSystem.Data;

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

    // Existing endpoints
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

    // NEW: Get weather by location ID
    [HttpGet("location/{locationId}")]
    public async Task<IActionResult> GetWeatherByLocation(int locationId)
    {
        var location = await _dbContext.Locations.FindAsync(locationId);

        if (location == null)
            return NotFound(new { message = $"Location with ID {locationId} not found" });

        // If location has coordinates, use them (more accurate)
        if (location.Latitude != 0 && location.Longitude != 0)
        {
            return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/weather?lat={location.Latitude}&lon={location.Longitude}&appid={_apiKey}&units=metric&lang=fr");
        }

        // Fallback to location name
        return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/weather?q={location.Name}&appid={_apiKey}&units=metric&lang=fr");
    }

    // NEW: Get forecast by location ID
    [HttpGet("location/{locationId}/forecast")]
    public async Task<IActionResult> GetForecastByLocation(int locationId)
    {
        var location = await _dbContext.Locations.FindAsync(locationId);

        if (location == null)
            return NotFound(new { message = $"Location with ID {locationId} not found" });

        // If location has coordinates, use them (more accurate)
        if (location.Latitude != 0 && location.Longitude != 0)
        {
            return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/forecast?lat={location.Latitude}&lon={location.Longitude}&appid={_apiKey}&units=metric&lang=fr");
        }

        // Fallback to location name
        return await CallOpenWeather($"https://api.openweathermap.org/data/2.5/forecast?q={location.Name}&appid={_apiKey}&units=metric&lang=fr");
    }

    // NEW: Get weather for multiple locations (start and end)
    [HttpGet("trip")]
    public async Task<IActionResult> GetWeatherForTrip([FromQuery] int startLocationId, [FromQuery] int endLocationId)
    {
        var startLocation = await _dbContext.Locations.FindAsync(startLocationId);
        var endLocation = await _dbContext.Locations.FindAsync(endLocationId);

        if (startLocation == null)
            return NotFound(new { message = $"Start location with ID {startLocationId} not found" });

        if (endLocation == null)
            return NotFound(new { message = $"End location with ID {endLocationId} not found" });

        var result = new
        {
            Start = await GetWeatherDataForLocation(startLocation),
            End = await GetWeatherDataForLocation(endLocation)
        };

        return Ok(result);
    }

    // Helper method to get weather data for a location
    private async Task<object> GetWeatherDataForLocation(Entity.Location location)
    {
        string url;

        if (location.Latitude != 0 && location.Longitude != 0)
        {
            url = $"https://api.openweathermap.org/data/2.5/weather?lat={location.Latitude}&lon={location.Longitude}&appid={_apiKey}&units=metric&lang=fr";
        }
        else
        {
            url = $"https://api.openweathermap.org/data/2.5/weather?q={location.Name}&appid={_apiKey}&units=metric&lang=fr";
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