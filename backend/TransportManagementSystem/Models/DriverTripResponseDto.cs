using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models;

public class DriverTripResponseDto
{
    [Required]
    public int TripId { get; set; }

    [Required]
    public string Action { get; set; } = string.Empty; // "accept" or "reject"

    public string? Reason { get; set; } // Required if rejecting
}
