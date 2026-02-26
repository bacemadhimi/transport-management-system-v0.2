using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity;
public class Employee
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    public string IdNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(100)]
    public string Email { get; set; } = string.Empty;

    [StringLength(50)]
    public string? DrivingLicense { get; set; } 
    public int? TypeTruckId { get; set; }

    [ForeignKey("TypeTruckId")]
    public TypeTruck? TypeTruck { get; set; }

    [Column(TypeName = "nvarchar(max)")]
    public string? DrivingLicenseAttachment { get; set; }

    [StringLength(50)]
    public string? AttachmentFileName { get; set; } 

    [StringLength(10)]
    public string? AttachmentFileType { get; set; } 

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public bool IsEnable { get; set; } = true;

    public int CategoryId { get; set; }
    [StringLength(50)]
    public string? EmployeeCategory { get; set; }
    //
    public bool IsInternal { get; set; } = true;
}
