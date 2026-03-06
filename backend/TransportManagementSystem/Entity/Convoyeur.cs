namespace TransportManagementSystem.Entity;

public class Convoyeur : Employee
{
    public Convoyeur()
    {
        EmployeeCategory = "CONVOYEUR";
    }

    public string Matricule { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

}
