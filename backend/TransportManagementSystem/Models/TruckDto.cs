namespace TransportManagementSystem.Models;

public class TruckDto
{
    public int? Id { get; set; }
    public required string Immatriculation { get; set; }
    public required DateTime TechnicalVisitDate { get; set; }
    public required string Brand { get; set; }
    public required string Status { get; set; }
    public required string Color { get; set; }
    public string? ImageBase64 { get; set; }
    public int? ZoneId { get; set; }
    public int TypeTruckId { get; set; }
    public TypeTruckDto TypeTruck { get; set; }
}
