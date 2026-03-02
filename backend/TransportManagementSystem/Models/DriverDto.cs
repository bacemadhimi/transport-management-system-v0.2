namespace TransportManagementSystem.Models;

public class DriverDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    // These are mapped from Employee properties
    public string? PermisNumber { get; set; } = string.Empty; // Maps to DrivingLicense
    public string? Phone { get; set; } = string.Empty; // Maps to PhoneNumber
    public string? Status { get; set; } = string.Empty;
    public string? PhoneCountry { get; set; } = string.Empty;
    public bool IsEnable { get; set; }

    // Driver-specific
    public int? IdCamion { get; set; }
}