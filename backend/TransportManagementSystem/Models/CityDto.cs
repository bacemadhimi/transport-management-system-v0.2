namespace TransportManagementSystem.Models
{
    public class CityDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int? ZoneId { get; set; }
        public string? ZoneName { get; set; }
    }
    public class CreateCityDto
    {
        public string Name { get; set; } = string.Empty;
        public bool? IsActive { get; set; }
        public int? ZoneId { get; set; }
    }
    public class UpdateCityDto
    {
        public string? Name { get; set; }
        public bool? IsActive { get; set; }
        public int? ZoneId { get; set; }
    }
}
