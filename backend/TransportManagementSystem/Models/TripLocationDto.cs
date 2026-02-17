namespace TransportManagementSystem.Models;

public class TripLocationDto
{
    public string Address { get; set; } = string.Empty;
    public int Sequence { get; set; }
    public string LocationType { get; set; } = "Pickup";
    public DateTime? ScheduledTime { get; set; }
    public string? Notes { get; set; }
}
