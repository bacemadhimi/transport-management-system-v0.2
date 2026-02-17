using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class DriverOvertimeController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DriverOvertimeController> _logger;

    private const decimal MAX_DAILY_OVERTIME_HOURS = 2m;
    public DriverOvertimeController(ApplicationDbContext context, ILogger<DriverOvertimeController> logger)
    {
        _context = context;
        _logger = logger;
    }
  
    [HttpPost("check")]
    public async Task<ActionResult<DriverOvertimeResultDto>> CheckDriverOvertime([FromBody] DriverOvertimeCheckDto request)
    {
        try
        {
         
            var driver = await _context.Drivers
                .FirstOrDefaultAsync(d => d.Id == request.DriverId);

            if (driver == null)
                return NotFound(new { message = $"Chauffeur ID {request.DriverId} non trouvé" });

         
            var overtimeSettings = await _context.OvertimeSettings
                .FirstOrDefaultAsync(o => o.DriverId == request.DriverId && o.IsActive);

     
            decimal maxDailyHours;
            if (overtimeSettings != null)
            {
                maxDailyHours = overtimeSettings.MaxDailyHours;
            }
            else
            {
                maxDailyHours = 8; 
            }

        
            var existingTrips = await GetTripsForDate(request.DriverId, request.Date, request.ExcludeTripId);
            var totalExistingHours = existingTrips.Sum(t => t.EstimatedDuration);

     
            var newTotalHours = totalExistingHours + (decimal)request.TripDuration;
            var maxTotalHours = maxDailyHours + MAX_DAILY_OVERTIME_HOURS;


            var result = new DriverOvertimeResultDto
            {
                DriverId = driver.Id,
                DriverName = driver.Name,
                TotalDailyHours = Math.Round(newTotalHours, 2),
                MaxNormalHours = maxDailyHours,
                MaxTotalHours = maxTotalHours,
                NewOvertimeHours = Math.Max(0, newTotalHours - maxDailyHours),
                RemainingNormalHours = Math.Max(0, maxDailyHours - totalExistingHours),
                RemainingOvertimeHours = Math.Max(0, maxTotalHours - totalExistingHours),
                ExistingTrips = existingTrips.Select(t => new DriverTripInfoDto
                {
                    TripId = t.Id,
                    TripReference = t.TripReference,
                    Duration = t.EstimatedDuration,
                    StartDate = t.EstimatedStartDate ?? DateTime.MinValue,
                    Status = t.TripStatus.ToString()
                }).ToList()
            };

            // 6. Déterminer le statut
            if (newTotalHours > maxTotalHours)
            {
                // DÉPASSEMENT DE LIMITE
                result.IsAvailable = false;
                result.Status = "exceeded";
                result.Message = $"DÉPASSEMENT: {newTotalHours:F1}h > {maxTotalHours}h maximum";
                result.RequiresApproval = false;
            }
            else if (newTotalHours > maxDailyHours)
            {
                // HEURES SUPPLÉMENTAIRES
                result.IsAvailable = true;
                result.Status = "overtime";
                result.RequiresApproval = true; // Demander approbation pour heures sup
                result.Message = $"HEURES SUP: +{result.NewOvertimeHours:F1}h (Approbation requise)";
            }
            else
            {
                // DANS LES LIMITES NORMALES
                result.IsAvailable = true;
                result.Status = "available";
                result.RequiresApproval = false;
                result.Message = $"OK: {newTotalHours:F1}h / {maxDailyHours}h";
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur vérification heures supplémentaires");
            return StatusCode(500, new { message = "Erreur interne", error = ex.Message });
        }
    }

    [HttpPost("availability")]
    public async Task<ActionResult<List<DriverOvertimeAvailabilityDto>>> GetDriversAvailability([FromBody] AvailabilityRequestDto request)
    {
        try
        {
            var result = new List<DriverOvertimeAvailabilityDto>();
            var driversQuery = _context.Drivers
                .Where(d => d.IsEnable);

            if (request.ZoneId.HasValue)
            {
                driversQuery = driversQuery.Where(d => d.ZoneId == request.ZoneId.Value);
            }

            var drivers = await driversQuery.ToListAsync();

            foreach (var driver in drivers)
            {
                var availability = await CheckDriverAvailability(driver, request.Date, request.TripDuration, request.ExcludeTripId);
                result.Add(availability);
            }

            // Trier: disponibles > heures sup > dépassés
            return Ok(result
                .OrderBy(d => d.Status == "exceeded" ? 2 : d.Status == "overtime" ? 1 : 0)
                .ThenBy(d => d.DriverName)
                .ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur chargement disponibilité chauffeurs");
            return StatusCode(500, new { message = "Erreur interne", error = ex.Message });
        }
    }

    private async Task<List<Trip>> GetTripsForDate(int driverId, DateTime date, int? excludeTripId)
    {
        var startOfDay = date.Date;
        var endOfDay = date.Date.AddDays(1).AddTicks(-1);

        var query = _context.Trips
            .Where(t => t.DriverId == driverId &&
                       t.EstimatedStartDate >= startOfDay &&
                       t.EstimatedStartDate <= endOfDay &&
                       t.TripStatus != TripStatus.Cancelled);

        if (excludeTripId.HasValue)
        {
            query = query.Where(t => t.Id != excludeTripId.Value);
        }

        return await query
            .OrderBy(t => t.EstimatedStartDate)
            .ToListAsync();
    }

    private async Task<DriverOvertimeAvailabilityDto> CheckDriverAvailability(Driver driver, DateTime date, double tripDuration, int? excludeTripId)
    {
        // Récupérer les paramètres du chauffeur
        var overtimeSettings = await _context.OvertimeSettings
            .FirstOrDefaultAsync(o => o.DriverId == driver.Id && o.IsActive);

        decimal maxDailyHours = overtimeSettings?.MaxDailyHours ?? 8;

        // Calculer les heures existantes
        var existingTrips = await GetTripsForDate(driver.Id, date, excludeTripId);
        var totalExistingHours = existingTrips.Sum(t => t.EstimatedDuration);

        // Calculer les totaux
        var newTotalHours = totalExistingHours + (decimal)tripDuration;
        var maxTotalHours = maxDailyHours + MAX_DAILY_OVERTIME_HOURS;
        var overtimeHours = Math.Max(0, newTotalHours - maxDailyHours);

        var availability = new DriverOvertimeAvailabilityDto
        {
            DriverId = driver.Id,
            DriverName = driver.Name,
            PermisNumber = driver.PermisNumber ?? "",
            TotalHours = Math.Round(newTotalHours, 2),
            MaxNormalHours = maxDailyHours,
            OvertimeHours = Math.Round(overtimeHours, 2)
        };

        // Déterminer le statut
        if (newTotalHours > maxTotalHours)
        {
            availability.IsAvailable = false;
            availability.Status = "exceeded";
            availability.StatusMessage = $"DÉPASSEMENT: {newTotalHours:F1}h > {maxTotalHours}h";
            availability.RequiresApproval = false;
            availability.StatusColor = "#ef4444"; // Rouge
            availability.StatusIcon = "block";
        }
        else if (newTotalHours > maxDailyHours)
        {
            availability.IsAvailable = true;
            availability.Status = "overtime";
            availability.StatusMessage = $"HEURES SUP: +{overtimeHours:F1}h";
            availability.RequiresApproval = true;
            availability.StatusColor = "#f59e0b"; // Orange
            availability.StatusIcon = "warning";
        }
        else
        {
            availability.IsAvailable = true;
            availability.Status = "available";
            availability.StatusMessage = $"OK: {newTotalHours:F1}h / {maxDailyHours}h";
            availability.RequiresApproval = false;
            availability.StatusColor = "#10b981"; // Vert
            availability.StatusIcon = "check_circle";
        }

        return availability;
    }
    [HttpPost("check-driver-with-trip-duration")]
    public async Task<ActionResult<DriverOvertimeResultDto>> CheckDriverWithTripDuration(
    [FromBody] DriverOvertimeCheckWithDurationDto request)
    {
        try
        {
            var driver = await _context.Drivers
                .FirstOrDefaultAsync(d => d.Id == request.DriverId);

            if (driver == null)
                return NotFound(new { message = $"Chauffeur ID {request.DriverId} non trouvé" });

            var overtimeSettings = await _context.OvertimeSettings
                .FirstOrDefaultAsync(o => o.DriverId == request.DriverId && o.IsActive);

            decimal maxDailyHours = overtimeSettings?.MaxDailyHours ?? 8;

            var existingTrips = await GetTripsForDate(request.DriverId, request.Date, request.ExcludeTripId);
            var totalExistingHours = existingTrips.Sum(t => t.EstimatedDuration);

            var newTotalHours = totalExistingHours + (decimal)request.TripDuration;
            var maxTotalHours = maxDailyHours + MAX_DAILY_OVERTIME_HOURS;

            var result = new DriverOvertimeResultDto
            {
                DriverId = driver.Id,
                DriverName = driver.Name,
                TotalDailyHours = Math.Round(newTotalHours, 2),
                MaxNormalHours = maxDailyHours,
                MaxTotalHours = maxTotalHours,
                NormalHoursUsed = Math.Min(totalExistingHours, maxDailyHours),
                OvertimeHoursUsed = Math.Max(0, totalExistingHours - maxDailyHours),
                NewOvertimeHours = Math.Max(0, newTotalHours - maxDailyHours),
                RemainingNormalHours = Math.Max(0, maxDailyHours - totalExistingHours),
                RemainingOvertimeHours = Math.Max(0, maxTotalHours - totalExistingHours),
                ExistingTrips = existingTrips.Select(t => new DriverTripInfoDto
                {
                    TripId = t.Id,
                    TripReference = t.TripReference,
                    Duration = t.EstimatedDuration,
                    StartDate = t.EstimatedStartDate ?? DateTime.MinValue,
                    Status = t.TripStatus.ToString()
                }).ToList()
            };

            // Determine status
            if (newTotalHours > maxTotalHours)
            {
                result.IsAvailable = false;
                result.Status = "exceeded";
                result.Message = $"DÉPASSEMENT: {newTotalHours:F1}h > {maxTotalHours}h maximum";
                result.RequiresApproval = false;
            }
            else if (newTotalHours > maxDailyHours)
            {
                result.IsAvailable = true;
                result.Status = "overtime";
                result.RequiresApproval = true;
                result.Message = $"HEURES SUP: +{result.NewOvertimeHours:F1}h (Approbation requise)";
            }
            else
            {
                result.IsAvailable = true;
                result.Status = "available";
                result.RequiresApproval = false;
                result.Message = $"OK: {newTotalHours:F1}h / {maxDailyHours}h";
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur vérification heures supplémentaires");
            return StatusCode(500, new { message = "Erreur interne", error = ex.Message });
        }
    }

    [HttpPost("check-driver-availability-real-time")]
    public async Task<ActionResult<DriverRealTimeAvailabilityDto>> CheckDriverAvailabilityRealTime(
        [FromBody] DriverRealTimeAvailabilityRequestDto request)
    {
        try
        {
            var driver = await _context.Drivers
                .FirstOrDefaultAsync(d => d.Id == request.DriverId);

            if (driver == null)
                return NotFound(new { message = $"Chauffeur ID {request.DriverId} non trouvé" });

            var overtimeSettings = await _context.OvertimeSettings
                .FirstOrDefaultAsync(o => o.DriverId == request.DriverId && o.IsActive);

            decimal maxDailyHours = overtimeSettings?.MaxDailyHours ?? 8;

            // Get trips for the day
            var existingTrips = await GetTripsForDate(request.DriverId, request.Date, request.ExcludeTripId);

            // Calculate if new trip overlaps with existing trips
            var hasConflict = false;
            string conflictReason = "";
            var newTripStart = request.StartTime;
            var newTripEnd = request.StartTime.AddHours(request.TripDuration);

            foreach (var trip in existingTrips)
            {
                var tripStart = trip.EstimatedStartDate ?? DateTime.MinValue;
                var tripEnd = tripStart.AddHours((double)trip.EstimatedDuration);

                if (newTripStart < tripEnd && newTripEnd > tripStart)
                {
                    hasConflict = true;
                    conflictReason = $"Conflit avec le voyage {trip.TripReference} ({tripStart:HH:mm} - {tripEnd:HH:mm})";
                    break;
                }
            }

            var totalExistingHours = existingTrips.Sum(t => t.EstimatedDuration);
            var newTotalHours = totalExistingHours + (decimal)request.TripDuration;
            var maxTotalHours = maxDailyHours + MAX_DAILY_OVERTIME_HOURS;

            var result = new DriverRealTimeAvailabilityDto
            {
                DriverId = driver.Id,
                DriverName = driver.Name,
                IsAvailable = !hasConflict && newTotalHours <= maxTotalHours,
                Status = hasConflict ? "conflict" :
                        newTotalHours > maxTotalHours ? "exceeded" :
                        newTotalHours > maxDailyHours ? "overtime" : "available",
                Message = hasConflict ? conflictReason :
                         newTotalHours > maxTotalHours ? $"DÉPASSEMENT: {newTotalHours:F1}h > {maxTotalHours}h" :
                         newTotalHours > maxDailyHours ? $"HEURES SUP: +{Math.Max(0, newTotalHours - maxDailyHours):F1}h" :
                         $"Disponible: {newTotalHours:F1}h / {maxDailyHours}h",
                TotalHoursToday = Math.Round(totalExistingHours, 2),
                NewTripHours = (decimal)request.TripDuration,
                TotalWithNewTrip = Math.Round(newTotalHours, 2),
                MaxNormalHours = maxDailyHours,
                MaxTotalHours = maxTotalHours,
                RequiresApproval = newTotalHours > maxDailyHours,
                HasConflict = hasConflict,
                ConflictReason = conflictReason
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur vérification disponibilité temps réel");
            return StatusCode(500, new { message = "Erreur interne", error = ex.Message });
        }
    }
}