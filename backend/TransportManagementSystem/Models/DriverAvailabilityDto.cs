namespace TransportManagementSystem.Models;

public class DriverAvailabilityDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; }
    public string Phone { get; set; }
    public string Status { get; set; }
    public bool IsAvailable { get; set; }
    public string Reason { get; set; }
    public bool IsDayOff { get; set; }
    public Dictionary<string, AvailabilityDayDto> Availability { get; set; }
    public string? ZoneName { get; set; }
    public string? PermisNumber { get; set; }
}

public class AvailabilityDayDto
{
    public bool IsAvailable { get; set; }
    public bool IsDayOff { get; set; }
    public string Reason { get; set; }
}

public class UpdateAvailabilityDto
{
    public string Date { get; set; } 
    public bool IsAvailable { get; set; }
    public bool IsDayOff { get; set; }
    public string Reason { get; set; }
}

public class AvailabilityFilterDto
{
    public int? PageIndex { get; set; } = 0;
    public int? PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string StartDate { get; set; } 
    public string EndDate { get; set; } 
}

public class AvailableDriversResponseDto
{
    public List<DriverAvailabilityDto> AvailableDrivers { get; set; }
    public List<DriverAvailabilityDto> UnavailableDrivers { get; set; }
    public bool IsWeekend { get; set; }
    public bool IsCompanyDayOff { get; set; }
    public DateTime Date { get; set; }
}