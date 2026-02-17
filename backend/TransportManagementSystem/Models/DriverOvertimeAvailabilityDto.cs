using static TransportManagementSystem.Controllers.DriverOvertimeController;

namespace TransportManagementSystem.Models;
public class DriverOvertimeCheckWithDurationDto
{
    public int DriverId { get; set; }
    public DateTime Date { get; set; }
    public double TripDuration { get; set; }
    public int? ExcludeTripId { get; set; }
}

public class DriverRealTimeAvailabilityRequestDto
{
    public int DriverId { get; set; }
    public DateTime Date { get; set; }
    public DateTime StartTime { get; set; }
    public double TripDuration { get; set; }
    public int? ExcludeTripId { get; set; }
}

public class DriverRealTimeAvailabilityDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; }
    public bool IsAvailable { get; set; }
    public string Status { get; set; } // "available", "overtime", "exceeded", "conflict"
    public string Message { get; set; }
    public decimal TotalHoursToday { get; set; }
    public decimal NewTripHours { get; set; }
    public decimal TotalWithNewTrip { get; set; }
    public decimal MaxNormalHours { get; set; }
    public decimal MaxTotalHours { get; set; }
    public bool RequiresApproval { get; set; }
    public bool HasConflict { get; set; }
    public string ConflictReason { get; set; }
    public List<DriverTripInfoDto> ExistingTrips { get; set; } = new();
}

public class AvailabilityRequestDto
{
    public DateTime Date { get; set; }
    public double TripDuration { get; set; }
    public int? ZoneId { get; set; }
    public int? ExcludeTripId { get; set; }
}


public class DriverOvertimeCheckDto
{
    public int DriverId { get; set; }
    public DateTime Date { get; set; }
    public double TripDuration { get; set; }
    public int? ExcludeTripId { get; set; }
}

public class DriverOvertimeResultDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; }
    public bool IsAvailable { get; set; }
    public string Status { get; set; } // "available", "overtime", "exceeded"
    public string Message { get; set; }

    // Heures
    public decimal TotalDailyHours { get; set; }
    public decimal MaxNormalHours { get; set; }
    public decimal MaxTotalHours { get; set; }
    public decimal NormalHoursUsed { get; set; }
    public decimal OvertimeHoursUsed { get; set; }
    public decimal NewOvertimeHours { get; set; }

    // Restant
    public decimal RemainingNormalHours { get; set; }
    public decimal RemainingOvertimeHours { get; set; }

    // Approbation
    public bool RequiresApproval { get; set; }

    // Détails voyages
    public List<DriverTripInfoDto> ExistingTrips { get; set; } = new();
}

public class DriverTripInfoDto
{
    public int TripId { get; set; }
    public string TripReference { get; set; }
    public decimal Duration { get; set; }
    public DateTime StartDate { get; set; }
    public string Status { get; set; }
}

public class DriverOvertimeAvailabilityDto
{
    public int DriverId { get; set; }
    public string DriverName { get; set; }
    public string PermisNumber { get; set; }
    public bool IsAvailable { get; set; }
    public string Status { get; set; }
    public string StatusMessage { get; set; }
    public decimal TotalHours { get; set; }
    public decimal MaxNormalHours { get; set; }
    public decimal OvertimeHours { get; set; }
    public bool RequiresApproval { get; set; }
    public string StatusColor { get; set; }
    public string StatusIcon { get; set; }
}


