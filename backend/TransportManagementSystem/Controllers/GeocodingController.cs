using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GeocodingController : ControllerBase
{
    private readonly IGeocodingService _geocodingService;
    private readonly IRepository<Location> _locationRepository;

    public GeocodingController(
        IGeocodingService geocodingService,
        IRepository<Location> locationRepository)
    {
        _geocodingService = geocodingService;
        _locationRepository = locationRepository;
    }

    /// <summary>
    /// Return multiple suggestions from Nominatim (3..5), with cache-first behavior.
    /// </summary>
    [HttpGet("suggest")]
    public async Task<IActionResult> Suggest([FromQuery] string query, [FromQuery] int limit = 5)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest(new { message = "Query is required" });

        var suggestions = await _geocodingService.SearchSuggestionsAsync(query, limit);

        var data = suggestions.Select(s => new GeocodingSuggestionDto
        {
            DisplayName = s.DisplayName,
            AddressText = s.Address,
            Latitude = s.Latitude,
            Longitude = s.Longitude,
            FromCache = false
        }).ToList();

        return Ok(data);
    }

    /// <summary>
    /// Confirm selected suggestion and persist as validated location.
    /// </summary>
    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmGeocodingSelectionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.AddressText))
            return BadRequest(new { message = "Name and AddressText are required" });

        if (!dto.ZoneId.HasValue)
            return BadRequest(new { message = "ZoneId is required" });

        if (dto.Latitude < -90 || dto.Latitude > 90 || dto.Longitude < -180 || dto.Longitude > 180)
            return BadRequest(new { message = "Invalid latitude/longitude" });

        var location = new Location
        {
            Name = dto.Name,
            AddressText = dto.DisplayName ?? dto.AddressText,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            IsValidated = true,
            IsActive = dto.IsActive ?? true,
            //ZoneId = dto.ZoneId.Value,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _locationRepository.AddAsync(location);
        await _locationRepository.SaveChangesAsync();

        return Ok(new ApiResponse(true, "Location validated and saved", new
        {
            location.Id,
            location.Name,
            location.AddressText,
            location.Latitude,
            location.Longitude,
            location.IsValidated
        }));
    }
}
