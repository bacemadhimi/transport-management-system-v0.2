using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Entity;

public class TripSetting
{
    [Key]
    public int Id { get; set; }

    public bool AllowEditTrips { get; set; } = true;

    public bool AllowDeleteTrips { get; set; } = true;

    public int EditTimeLimit { get; set; } = 60; // in minutes

    public int MaxTripsPerDay { get; set; } = 10;

    public string TripOrder { get; set; } = "chronological";
    // "chronological" | "alphabetical" | "custom"

    public bool RequireDeleteConfirmation { get; set; } = true;

    public bool NotifyOnTripEdit { get; set; } = false;

    public bool NotifyOnTripDelete { get; set; } = false;
    public bool LinkDriverToTruck{ get; set; } = true;
}
