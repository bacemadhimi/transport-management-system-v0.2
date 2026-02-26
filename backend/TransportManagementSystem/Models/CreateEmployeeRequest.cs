namespace TransportManagementSystem.Models;


public class CreateEmployeeRequest
{
    public string IdNumber { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? DrivingLicense { get; set; }

    public int? TypeTruckId { get; set; }

    public string? EmployeeCategory { get; set; }
    public IFormFile? DrivingLicenseFile { get; set; }
    public bool IsInternal { get; set; } = true;
}
