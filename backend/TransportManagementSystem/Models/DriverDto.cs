namespace TransportManagementSystem.Models;

public class DriverDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PermisNumber { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PhoneCountry { get; set; } = string.Empty;
    public bool IsEnable { get; set; } 
}
