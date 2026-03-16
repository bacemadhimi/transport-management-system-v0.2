namespace TransportManagementSystem.Entity
{
    public class ResultatOptimisation
    {
        public int Id { get; set; }
        
        public int TripId { get; set; }
        public Trip? Trip { get; set; }
        
        public double DistanceOptimale { get; set; } // en km
        
        public int TempsEstime { get; set; } // en minutes
        
        public double CoutEstime { get; set; } // en devises
        
        public string? ItineraireOptimise { get; set; } // JSON avec coordonnées
        
        public double? EconomieDistance { get; set; } // % d'économie vs distance initiale
        
        public double? EconomieTemps { get; set; } // % d'économie vs temps initial
        
        public DateTime DateCalcul { get; set; } = DateTime.UtcNow;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
