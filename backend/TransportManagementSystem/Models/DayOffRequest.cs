namespace TransportManagementSystem.Models;

public class DayOffRequest
{
    public string Country { get; set; }
    public DateTime Date { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
}

public class DayOffResponse
{
    public int Id { get; set; }
    public string Country { get; set; }
    public string Date { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public string DayOfWeek { get; set; }
    public bool IsWeekend { get; set; }
    public DateTime CreatedDate { get; set; }
}
