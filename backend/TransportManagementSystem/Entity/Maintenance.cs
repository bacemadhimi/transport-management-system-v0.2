using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class Maintenance
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [ForeignKey("Trip")]
        public int TripId { get; set; }

        public Trip Trip { get; set; }

        [Required]
        [ForeignKey("Vendor")]
        public int VendorId { get; set; }

        public Vendor Vendor { get; set; }

        [Required]
        [ForeignKey("Mechanic")]
        public int MechanicId { get; set; }
        public Mechanic Mechanic { get; set; }

        [Required]
        public string Status { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int OdometerReading {get; set;}
        public float TotalCost { get; set; }

        public string ServiceDetails { get; set; }
        public string PartsName { get; set; }
        public int Qty { get; set; }
        public NotificationTypeEnum NotificationType { get; set; }
        public string Members { get; set; }

        public string MaintenanceType { get; set; } = "General"; // "Vidange", "Révision", "Réparation", "Général"
        public DateTime? NextVidangeDate { get; set; }
        public int? NextVidangeKm { get; set; }
        public bool IsVidange { get; set; }
        public string? OilType { get; set; }
        public decimal? OilQuantity { get; set; }
        public string? OilFilter { get; set; }


        public enum NotificationTypeEnum
        {
            Email,
            SMS,
            Both
        }
    }
}
