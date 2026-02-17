namespace TransportManagementSystem.Models;

public class ConvoyeurDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Matricule { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PhoneCountry { get; set; } = string.Empty;
}
