namespace TransportManagementSystem.Models;

/// <summary>
/// DTO for updating an employee with file upload support
/// </summary>
public class UpdateEmployeeRequest
{
    public string IdNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? DrivingLicense { get; set; }

    public int? TypeTruckId { get; set; }

    public bool IsEnable { get; set; } = true;

    public IFormFile? DrivingLicenseFile { get; set; }
}
