namespace TransportManagementSystem.Models;

public class TripCountDto
{
    public int TripsCreatedToday { get; set; }
    public int MaxTripsPerDay { get; set; }
    public bool HasReachedLimit { get; set; }
    public string Date { get; set; }
}
