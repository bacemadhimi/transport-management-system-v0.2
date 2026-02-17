using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TransportManagementSystem.Entity
{
    public class Fuel
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [ForeignKey("Truck")]
        public int TruckId { get; set; }

        public Truck? Truck { get; set; }
        [Required]
        [ForeignKey("Driver")]
        public int DriverId { get; set; }

        public Driver? Driver { get; set; }

        [Required]
        public DateTime? FillDate { get; set; }
        
        public int? Quantity { get; set; }
    
        public string? OdometerReading { get; set; }
 
        public float? Amount { get; set; }
        public string? Comment { get; set; }

        public string? FuelTank { get; set; }

        [ForeignKey("FuelVendor")]
        public int FuelVendorId { get; set; }
        public FuelVendor? FuelVendor { get; set; }
    }
}