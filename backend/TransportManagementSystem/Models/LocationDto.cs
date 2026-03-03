namespace TransportManagementSystem.Models;

public class LocationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public required string Address { get; set; }
    public required double Longitude { get; set; }
    public required double Latitude { get; set; }
}

public class CreateLocationDto
{
    public string Name { get; set; } = string.Empty;
    public bool? IsActive { get; set; }
    public required string Address { get; set; }
    public required double Longitude { get; set; }
    public required double Latitude { get; set; }
}

public class UpdateLocationDto
{
    public string? Name { get; set; }
    public bool? IsActive { get; set; }
    public required string Address { get; set; }
    public required double Longitude { get; set; }
    public required double Latitude { get; set; }
}
