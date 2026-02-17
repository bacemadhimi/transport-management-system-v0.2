using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;

public class OvertimeSetting
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    public int DriverId { get; set; }

    [ForeignKey("DriverId")]
    public virtual Driver Driver { get; set; }

    [Required]
    public bool IsActive { get; set; } = true;

    [Required]
    [Range(0, 24)]
    [Column(TypeName = "decimal(5,2)")]
    public decimal MaxDailyHours { get; set; } = 12;

    [Required]
    [Range(0, 168)]
    [Column(TypeName = "decimal(5,2)")]
    public decimal MaxWeeklyHours { get; set; } = 60;

    [Required]
    [Range(0, 1000)]
    [Column(TypeName = "decimal(10,2)")]
    public decimal OvertimeRatePerHour { get; set; }

    [Required]
    public bool AllowWeekendOvertime { get; set; } = true;

    [Required]
    public bool AllowHolidayOvertime { get; set; } = true;

    [Range(0, 100)]
    [Column(TypeName = "decimal(5,2)")]
    public decimal? WeekendRateMultiplier { get; set; } = 1.5m;

    [Range(0, 100)]
    [Column(TypeName = "decimal(5,2)")]
    public decimal? HolidayRateMultiplier { get; set; } = 2.0m;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}