namespace TransportManagementSystem.Models
{
    public class CustomerDto
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public string? Phone { get; set; }
        public string? City { get; set; }
        public required string Email { get; set; }
        public required string Adress { get; set; }
        public required string Matricule { get; set; }
        public string? Gouvernorat { get; set; }
        public required string Contact { get; set; }
        public int? ZoneId { get; set; }
        public string? SourceSystem { get; set; }
    }
}
