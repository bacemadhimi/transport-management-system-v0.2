using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models;

/// <summary>
/// DTO for updating an employee with file upload support
/// </summary>
public class UpdateEmployeeRequest
{
    [Required]
    [StringLength(50)]
    public string IdNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(20)]
    public string? PhoneCountry { get; set; }

    [Required]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(100)]
    public string Email { get; set; } = string.Empty;

    [StringLength(50)]
    public string? DrivingLicense { get; set; }

    public int? TypeTruckId { get; set; }

    public IFormFile? DrivingLicenseFile { get; set; }

    [Required]
    [StringLength(50)]
    public string? EmployeeCategory { get; set; }

    public bool IsInternal { get; set; } = true;

    public bool IsEnable { get; set; } = true;

    // Driver-specific properties (optional)
    public string? Status { get; set; }

    // Convoyeur-specific properties (optional)
    public string? Matricule { get; set; }
}