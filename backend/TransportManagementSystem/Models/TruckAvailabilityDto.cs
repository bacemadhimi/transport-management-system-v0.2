namespace TransportManagementSystem.Models;

public class TruckAvailabilityDto
{
    public int TruckId { get; set; }
    public string Immatriculation { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsDayOff { get; set; }
    public string Reason { get; set; }
    public string Brand { get; set; }
    public Dictionary<string, AvailabilityDayDto> Availability { get; set; }
}

public class UpdateTruckAvailabilityDto
{
    public string Date { get; set; } // yyyy-MM-dd
    public bool IsAvailable { get; set; }
    public bool IsDayOff { get; set; }
    public string? Reason { get; set; }
}
