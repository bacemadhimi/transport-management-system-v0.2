using System.ComponentModel.DataAnnotations;
using TransportManagementSystem.Entity;


namespace TransportManagementSystem.Models
{
    public class TripDto
    {
        [Required]
        public int CustomerId { get; set; }

        [Required]
        public DateTime TripStartDate { get; set; }

        [Required]
        public DateTime TripEndDate { get; set; }

        public int TruckId { get; set; }

        public int DriverId { get; set; }

        [Required]
        public string TripStartLocation { get; set; }

        [Required]
        public string TripEndLocation { get; set; }

        public double? ApproxTotalKM { get; set; }

        [Required]
        public TripStatus TripStatus { get; set; } 

        [Required]
        public double StartKmsReading { get; set; }

        public List<TripLocationDto> Locations { get; set; } = new List<TripLocationDto>();
        public int? TrajectId { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? CreatedAt { get; set; }

        public int? UpdatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
