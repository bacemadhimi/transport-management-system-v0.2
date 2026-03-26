using System.ComponentModel.DataAnnotations;

namespace TransportManagementSystem.Models;

public class TruckDto
{
    public int? Id { get; set; }
    public required string Immatriculation { get; set; }
    public required DateTime TechnicalVisitDate { get; set; }
    public required DateTime DateOfFirstRegistration { get; set; }
    public required int EmptyWeight { get; set; }
    public required int MarqueTruckId { get; set; }
    public required string Status { get; set; }
    public required string Color { get; set; }
    public List<string>? Images { get; set; }
    public int? ZoneId { get; set; }
    public int TypeTruckId { get; set; }
    public TypeTruckDto? TypeTruck { get; set; }
    public List<TruckGeographicalEntityDto> GeographicalEntities { get; set; }
    public int? DriverId { get; set; }

}
public class TruckGeographicalEntityDto
{
    [Required]
    public int GeographicalEntityId { get; set; }
    public string? GeographicalEntityName { get; set; }
    public string? LevelName { get; set; }
    public int LevelNumber { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
}