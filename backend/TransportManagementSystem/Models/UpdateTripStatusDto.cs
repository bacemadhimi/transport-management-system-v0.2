using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class UpdateTripStatusDto
{
    public TripStatus Status { get; set; }
    public string? Notes { get; set; }
}
