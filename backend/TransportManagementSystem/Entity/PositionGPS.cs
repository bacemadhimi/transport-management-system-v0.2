namespace TransportManagementSystem.Entity
{
    public class PositionGPS
    {
        public int Id { get; set; }
        
        public int? DriverId { get; set; }
        public Driver? Driver { get; set; }
        
        public int? TruckId { get; set; }
        public Truck? Truck { get; set; }
        
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        
        public double? Accuracy { get; set; } // Précision en mètres
        
        public DateTime Timestamp { get; set; }
        
         public string? Source { get; set; } // "Mobile" ou "TruckGPS"
         
         public bool IsSynchronized { get; set; } = false; // Pour offline
         
         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
