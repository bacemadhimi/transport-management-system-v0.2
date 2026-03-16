namespace TransportManagementSystem.Models
{
    public class OptimizationPointDto
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string? Name { get; set; }
        public int? Order { get; set; }
    }

    public class OptimizeRouteDto
    {
        public int TripId { get; set; }
        public int VehicleCount { get; set; } = 1;
        public List<OptimizationPointDto> Points { get; set; } = new();
    }

    public class EstimateTimeDto
    {
        public double Distance { get; set; }
    }
}