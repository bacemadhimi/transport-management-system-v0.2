using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

/// <summary>
/// Cache table for storing geocoded addresses to avoid repeated API calls
/// </summary>
public class GeocodingCache
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// The original address text that was geocoded
    /// </summary>
    [Required]
    public string AddressText { get; set; } = string.Empty;

    /// <summary>
    /// Latitude result
    /// </summary>
    public double Latitude { get; set; }

    /// <summary>
    /// Longitude result
    /// </summary>
    public double Longitude { get; set; }

    /// <summary>
    /// Formatted address returned by the geocoding service
    /// </summary>
    public string? FormattedAddress { get; set; }

    /// <summary>
    /// When this entry was cached
    /// </summary>
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this cache entry expires (default: 30 days)
    /// </summary>
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(30);
}
