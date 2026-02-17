using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WeatherController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _apiKey = "aacff7d0d86c768bc724481f653d95c2";

    public WeatherController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

 
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
