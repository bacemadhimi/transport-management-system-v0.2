namespace TransportManagementSystem.Models;

public class DriverGeographicalEntityDto
{
    public int GeographicalEntityId { get; set; }
    public string? GeographicalEntityName { get; set; }
    public string? LevelName { get; set; }
    public int LevelNumber { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
}

public class DriverDto
{
    public int Id { get; set; }
    public string IdNumber { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string? PhoneCountry { get; set; }
    public string DrivingLicense { get; set; }
    public int? TypeTruckId { get; set; }
    public TypeTruckDto? TypeTruck { get; set; }
    public string? DrivingLicenseAttachment { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentFileType { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsEnable { get; set; }
    public string EmployeeCategory { get; set; }
    public bool IsInternal { get; set; }

    // Driver-specific properties
    public string? Status { get; set; }
    public int? IdCamion { get; set; }
    public int? ZoneId { get; set; }
    public string? ZoneName { get; set; }
    public int? CityId { get; set; }
    public string? ImageBase64 { get; set; }

    // Geographical entities (same pattern as Truck)
    public List<DriverGeographicalEntityDto> GeographicalEntities { get; set; } = new();
}