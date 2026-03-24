namespace TransportManagementSystem.Models;

public class GeocodingSuggestionDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string AddressText { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool FromCache { get; set; }
}

public class ConfirmGeocodingSelectionDto
{
    public string Name { get; set; } = string.Empty;
    public string AddressText { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int? ZoneId { get; set; }
    public bool? IsActive { get; set; }
}
