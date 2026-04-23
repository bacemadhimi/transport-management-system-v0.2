using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DayOffController : ControllerBase
{
    private readonly ApplicationDbContext dbContext;
    private readonly HttpClient httpClient;
    private const string CALENDARIFIC_API_KEY = "SU2jXfAV06bVELL6Hys13LhyADekB1SW"; 
    private const string CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2";

    public DayOffController(ApplicationDbContext context, IHttpClientFactory httpClientFactory)
    {
        dbContext = context;
        httpClient = httpClientFactory.CreateClient();
    }


    [HttpPost("import-public-holidays")]
    public async Task<IActionResult> ImportPublicHolidays([FromBody] HolidaysDto request)
    {
        try
        {
            var year = request.Year > 0 ? request.Year : DateTime.Now.Year;
            var countryCode = !string.IsNullOrEmpty(request.CountryCode) ? request.CountryCode : "TN";
            var countryName = GetCountryName(countryCode);
            var totalImported = 0;
            var totalSkipped = 0;

            var url = $"{CALENDARIFIC_BASE_URL}/holidays?api_key={CALENDARIFIC_API_KEY}&country={countryCode}&year={year}";

            var response = await httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                
                return await ImportFromNagerApi(year, countryCode, countryName);
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<CalendarificResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Response?.Holidays == null || !result.Response.Holidays.Any())
            {
                return NotFound(new { message = "No holidays found.", status = 404 });
            }

            foreach (var holiday in result.Response.Holidays)
            {
                var holidayDate = DateTime.Parse(holiday.Date.Iso);

                var existing = await dbContext.DayOffs
                    .FirstOrDefaultAsync(d => d.Date.Date == holidayDate.Date && d.Country == countryName && d.Name == holiday.Name);

                if (existing == null)
                {
                    dbContext.DayOffs.Add(new DayOff
                    {
                        Name = holiday.Name,
                        Date = holidayDate,
                        Country = countryName,
                        Description = $"{holiday.Description} - Type: {string.Join(", ", holiday.Type)}"
                    });
                    totalImported++;
                }
                else
                {
                    existing.Description = $"{holiday.Description} - Type: {string.Join(", ", holiday.Type)}";
                    totalSkipped++;
                }
            }

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = "Holidays imported successfully",
                status = 200,
                year,
                countryCode,
                countryName,
                importedCount = totalImported,
                skippedCount = totalSkipped,
                totalHolidays = result.Response.Holidays.Count
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error importing holidays", error = ex.Message });
        }
    }


    private async Task<IActionResult> ImportFromNagerApi(int year, string countryCode, string countryName)
    {
        try
        {
            var url = $"https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}";
            var response = await httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return BadRequest(new { message = $"Unable to fetch holidays from API", status = 400 });
            }

            var content = await response.Content.ReadAsStringAsync();
            var holidays = JsonSerializer.Deserialize<List<HolidaysDto>>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var importedCount = 0;
            var skippedCount = 0;

            if (holidays != null)
            {
                foreach (var holiday in holidays)
                {
                    var existing = await dbContext.DayOffs
                        .FirstOrDefaultAsync(d => d.Date.Date == holiday.Date.Date && d.Country == countryName && d.Name == holiday.LocalName);

                    if (existing == null)
                    {
                        dbContext.DayOffs.Add(new DayOff
                        {
                            Name = holiday.LocalName,
                            Date = holiday.Date,
                            Country = countryName,
                            Description = $"{holiday.Name} - {string.Join(", ", holiday.Types ?? new List<string>())}"
                        });
                        importedCount++;
                    }
                    else
                    {
                        skippedCount++;
                    }
                }
            }

            await dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = "Holidays imported from Nager.Date (public holidays only, no Islamic holidays)",
                status = 200,
                year,
                countryCode,
                countryName,
                importedCount,
                skippedCount,
                note = "Islamic holidays not available in this API. Use Calendarific API for complete list."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error importing from Nager API", error = ex.Message });
        }
    }

   
    [HttpGet("public-holidays")]
    public async Task<IActionResult> GetPublicHolidays([FromQuery] int year, [FromQuery] string countryCode = "TN")
    {
        try
        {
            
            var url = $"{CALENDARIFIC_BASE_URL}/holidays?api_key={CALENDARIFIC_API_KEY}&country={countryCode}&year={year}";
            var response = await httpClient.GetAsync(url);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<CalendarificResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                var holidays = result?.Response?.Holidays?.Select(h => new
                {
                    h.Name,
                    Date = h.Date.Iso,
                    Country = result.Response.Country.Name,
                    h.Description,
                    h.Type,
                    Locations = h.Locations
                }).ToList();

                return Ok(new
                {
                    message = $"Holidays for {countryCode} in {year}",
                    status = 200,
                    data = holidays,
                    totalCount = holidays?.Count ?? 0
                });
            }

           
            return Ok(new { message = "Use Calendarific API for complete list with Islamic holidays" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching holidays", error = ex.Message });
        }
    }

    [HttpGet("Pagination and Search")]
    public async Task<IActionResult> GetDayOffs([FromQuery] SearchOptions searchOption, [FromQuery] string? country = null, [FromQuery] int? year = null)
    {
        var query = dbContext.DayOffs.AsQueryable();

        if (!string.IsNullOrEmpty(country))
            query = query.Where(d => d.Country == country);

        if (year.HasValue)
            query = query.Where(d => d.Date.Year == year.Value);

        if (!string.IsNullOrEmpty(searchOption.Search))
            query = query.Where(d =>
                (d.Name != null && d.Name.Contains(searchOption.Search)) ||
                (d.Description != null && d.Description.Contains(searchOption.Search))
            );

        var totalData = await query.CountAsync();

        if (searchOption.PageIndex.HasValue && searchOption.PageSize.HasValue)
        {
            query = query.OrderBy(d => d.Date)
                .Skip(searchOption.PageIndex.Value * searchOption.PageSize.Value)
                .Take(searchOption.PageSize.Value);
        }

        return Ok(new PagedData<DayOff>
        {
            Data = await query.ToListAsync(),
            TotalData = totalData
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DayOff>> GetDayOff(int id)
    {
        var dayOff = await dbContext.DayOffs.FindAsync(id);
        if (dayOff == null)
            return NotFound(new { message = $"DayOff with ID {id} not found.", Status = 404 });
        return dayOff;
    }

    [HttpPost]
    public async Task<ActionResult<DayOff>> CreateDayOff(DayOff dayOff)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        dbContext.DayOffs.Add(dayOff);
        await dbContext.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDayOff), new { id = dayOff.Id }, dayOff);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDayOff(int id, DayOff dayOff)
    {
        var existing = await dbContext.DayOffs.FindAsync(id);
        if (existing == null)
            return NotFound(new { message = $"DayOff with ID {id} not found.", Status = 404 });
        existing.Country = dayOff.Country;
        existing.Date = dayOff.Date;
        existing.Name = dayOff.Name;
        existing.Description = dayOff.Description;
        await dbContext.SaveChangesAsync();
        return Ok(new { message = $"DayOff with ID {id} updated successfully.", Status = 200, Data = existing });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDayOff(int id)
    {
        var existing = await dbContext.DayOffs.FindAsync(id);
        if (existing == null)
            return NotFound(new { message = $"DayOff with ID {id} not found.", Status = 404 });
        dbContext.DayOffs.Remove(existing);
        await dbContext.SaveChangesAsync();
        return Ok(new { message = $"DayOff with ID {id} deleted successfully.", Status = 200 });
    }

    private string GetCountryName(string countryCode)
    {
        return countryCode.ToUpper() switch
        {
            "TN" => "Tunisie",
            "FR" => "France",
            "DZ" => "Algérie",
            "MA" => "Maroc",
            "LY" => "Libye",
            _ => countryCode
        };
    }
}


