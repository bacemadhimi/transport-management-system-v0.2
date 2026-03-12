namespace TransportManagementSystem.Models
{
    public class TripMapDto
    {
        public int Id { get; set; }
        public string TripReference { get; set; }
        public string TripStatus { get; set; }
        public DateTime? EstimatedStartDate { get; set; }
        public DateTime? EstimatedEndDate { get; set; }
        public DateTime? ActualStartDate { get; set; }
        public DateTime? ActualEndDate { get; set; }
        public decimal EstimatedDistance { get; set; }

        // Truck information
        public int TruckId { get; set; }
        public string TruckImmatriculation { get; set; }
        public int MarqueTruckId { get; set; }
        public int? TruckZoneId { get; set; }

        // Driver information (Employee with category "DRIVER")
        public int DriverId { get; set; }
        public string DriverName { get; set; }
        public string DriverPhone { get; set; }
        public string DriverEmail { get; set; }
        public string? DriverPermisNumber { get; set; } // Additional driver info

        // Convoyeur information (Employee with category "CONVOYEUR")
        public int? ConvoyeurId { get; set; }
        public string? ConvoyeurName { get; set; }
        public string? ConvoyeurPhone { get; set; }
        public string? ConvoyeurEmail { get; set; }
        public string? ConvoyeurMatricule { get; set; }

        // Deliveries
        public List<DeliveryMapDto> Deliveries { get; set; }
    }

    public class DeliveryMapDto
    {
        public int Id { get; set; }
        public int Sequence { get; set; }
        public string DeliveryAddress { get; set; }
        public string Status { get; set; }
        public DateTime? PlannedTime { get; set; }
        public DateTime? ActualArrivalTime { get; set; }
        public string Notes { get; set; }

        // Customer information
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public int? CustomerZoneId { get; set; }
        public string CustomerGouvernorat { get; set; }

        // Order information
        public int OrderId { get; set; }
        public string OrderReference { get; set; }
        public decimal OrderWeight { get; set; }
        public string OrderStatus { get; set; }
    }
}