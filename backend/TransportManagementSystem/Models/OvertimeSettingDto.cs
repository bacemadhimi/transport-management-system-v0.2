using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models;

public class OvertimeSettingDto
{
    public int Id { get; set; }
    public int DriverId { get; set; }
    public string DriverName { get; set; }
    public bool IsActive { get; set; }
    public decimal MaxDailyHours { get; set; }
    public decimal MaxWeeklyHours { get; set; }
    public decimal OvertimeRatePerHour { get; set; }
    public bool AllowWeekendOvertime { get; set; }
    public bool AllowHolidayOvertime { get; set; }
    public decimal? WeekendRateMultiplier { get; set; }
    public decimal? HolidayRateMultiplier { get; set; }
    public string? Notes { get; set; }
}

public class CreateOvertimeSettingDto
{
    [Required]
    public int DriverId { get; set; }

    [Required]
    public bool IsActive { get; set; } = true;

    [Required]
    [Range(0, 24)]
    public decimal MaxDailyHours { get; set; } = 12;

    [Required]
    [Range(0, 168)]
    public decimal MaxWeeklyHours { get; set; } = 60;

    [Required]
    [Range(0, 1000)]
    public decimal OvertimeRatePerHour { get; set; }

    public bool AllowWeekendOvertime { get; set; } = true;
    public bool AllowHolidayOvertime { get; set; } = true;

    [Range(0, 100)]
    public decimal? WeekendRateMultiplier { get; set; } = 1.5m;

    [Range(0, 100)]
    public decimal? HolidayRateMultiplier { get; set; } = 2.0m;

    public string? Notes { get; set; }
}