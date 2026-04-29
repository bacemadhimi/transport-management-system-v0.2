namespace TransportManagementSystem.Models;

public class HolidaysDto
{
    public DateTime Date { get; set; }
    public string LocalName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public bool Fixed { get; set; }
    public bool Global { get; set; }
    public List<string>? Counties { get; set; }
    public int? LaunchYear { get; set; }
    public List<string> Types { get; set; } = new();
    public int Year { get; set; }
}
public class NagerCountry
{
    public string CountryCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
public class CalendarificResponse
{
    public CalendarificMeta? Meta { get; set; }
    public CalendarificData? Response { get; set; }
}

public class CalendarificMeta
{
    public int Code { get; set; }
}

public class CalendarificData
{
    public List<CalendarificHoliday> Holidays { get; set; } = new();
    public CalendarificCountry? Country { get; set; }
}

public class CalendarificCountry
{
    public string Name { get; set; } = string.Empty;
}

public class CalendarificHoliday
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CalendarificDate Date { get; set; } = new();
    public List<string> Type { get; set; } = new();
    public string? Locations { get; set; }
}

public class CalendarificDate
{
    public string Iso { get; set; } = string.Empty;
    public CalendarificDateTime? Datetime { get; set; }
}

public class CalendarificDateTime
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int Day { get; set; }
}