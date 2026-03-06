namespace TransportManagementSystem.Models
{
    public class CustomerGeographicalEntityDto
    {
        public int GeographicalEntityId { get; set; }
        public string? GeographicalEntityName { get; set; }
        public string? LevelName { get; set; }
        public int LevelNumber { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }

    public class CustomerDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? PhoneCountry { get; set; }
        public string? Email { get; set; }
        public string Matricule { get; set; } = string.Empty;
        public string? Contact { get; set; }
        public string SourceSystem { get; set; } = "TMS";
        public List<CustomerGeographicalEntityDto> GeographicalEntities { get; set; } = new();
    }
}