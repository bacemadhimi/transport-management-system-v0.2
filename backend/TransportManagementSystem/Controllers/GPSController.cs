using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Service;
using TransportManagementSystem.Models;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using Microsoft.EntityFrameworkCore;

namespace TransportManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GPSController : ControllerBase
    {
        private readonly IGPSService _gpsService;
        private readonly IOptimisationService _optimisationService;
        private readonly ILogger<GPSController> _logger;
        private readonly ApplicationDbContext _context;

        public GPSController(
            IGPSService gpsService,
            IOptimisationService optimisationService,
            ILogger<GPSController> logger,
            ApplicationDbContext context)
        {
            _gpsService = gpsService;
            _optimisationService = optimisationService;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// Envoyer une position GPS
        /// </summary>
        [HttpPost("position")]
        public async Task<IActionResult> SendPosition([FromBody] GPSPositionDto dto)
        {
            try
            {
                if (dto.Latitude < -90 || dto.Latitude > 90 || dto.Longitude < -180 || dto.Longitude > 180)
                    return BadRequest(new { message = "Coordonnées GPS invalides" });

                var position = await _gpsService.SavePositionAsync(
                    dto.DriverId,
                    dto.TruckId,
                    dto.Latitude,
                    dto.Longitude,
                    dto.Source ?? "Mobile"
                );

                return Ok(new
                {
                    message = "Position GPS enregistrée",
                    data = position
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending position: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de l'enregistrement" });
            }
        }

        /// <summary>
        /// Envoyer un lot de positions GPS (mode offline sync)
        /// </summary>
        [HttpPost("batch")]
        public async Task<IActionResult> SendBatchPositions([FromBody] GPSBatchDto dto)
        {
            try
            {
                if (dto?.Positions == null || !dto.Positions.Any())
                    return BadRequest(new { message = "Aucune position fournie" });

                foreach (var p in dto.Positions)
                {
                    if (p.Latitude < -90 || p.Latitude > 90 || p.Longitude < -180 || p.Longitude > 180)
                        return BadRequest(new { message = "Une ou plusieurs coordonnées GPS sont invalides" });
                }

                foreach (var p in dto.Positions)
                {
                    await _gpsService.SavePositionAsync(
                        p.DriverId,
                        p.TruckId,
                        p.Latitude,
                        p.Longitude,
                        p.Source ?? "Mobile"
                    );
                }

                return Ok(new
                {
                    message = "Batch GPS enregistré",
                    count = dto.Positions.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending batch positions: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de l'enregistrement du batch" });
            }
        }

        /// <summary>
        /// Obtenir les dernières positions GPS
        /// </summary>
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatestPositions([FromQuery] int limit = 50)
        {
            try
            {
                if (limit <= 0) limit = 50;
                if (limit > 500) limit = 500;

                var positions = await _gpsService.GetLatestPositionsAsync(limit);

                var result = positions.Select(p => new
                {
                    p.Id,
                    p.DriverId,
                    p.TruckId,
                    p.Latitude,
                    p.Longitude,
                    p.Timestamp,
                    p.Source
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting latest positions: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la récupération des positions" });
            }
        }

        /// <summary>
        /// Obtenir l'historique des positions d'un chauffeur
        /// </summary>
        [HttpGet("driver/{driverId}")]
        public async Task<IActionResult> GetDriverPositions(int driverId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            try
            {
                var positions = await _gpsService.GetPositionsAsync(driverId, null, startDate, endDate);
                var result = positions.Select(p => new
                {
                    p.Id,
                    p.DriverId,
                    p.TruckId,
                    p.Latitude,
                    p.Longitude,
                    p.Timestamp,
                    p.Source
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting driver positions: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la récupération des positions chauffeur" });
            }
        }

        /// <summary>
        /// Obtenir l'historique des positions d'un camion
        /// </summary>
        [HttpGet("truck/{truckId}")]
        public async Task<IActionResult> GetTruckPositions(int truckId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            try
            {
                var positions = await _gpsService.GetPositionsAsync(null, truckId, startDate, endDate);
                var result = positions.Select(p => new
                {
                    p.Id,
                    p.DriverId,
                    p.TruckId,
                    p.Latitude,
                    p.Longitude,
                    p.Timestamp,
                    p.Source
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting truck positions: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la récupération des positions camion" });
            }
        }

        /// <summary>
        /// Obtenir la dernière position d'un chauffeur
        /// </summary>
        [HttpGet("driver/{driverId}/latest")]
        public async Task<IActionResult> GetLatestDriverPosition(int driverId)
        {
            try
            {
                var position = await _gpsService.GetLatestPositionByDriverAsync(driverId);
                if (position == null)
                    return NotFound(new { message = "Aucune position trouvée pour ce chauffeur" });

                return Ok(new
                {
                    position.Id,
                    position.DriverId,
                    position.TruckId,
                    position.Latitude,
                    position.Longitude,
                    position.Timestamp,
                    position.Source
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting latest driver position: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la récupération de la dernière position chauffeur" });
            }
        }

        /// <summary>
        /// Obtenir la dernière position d'un camion
        /// </summary>
        [HttpGet("truck/{truckId}/latest")]
        public async Task<IActionResult> GetLatestTruckPosition(int truckId)
        {
            try
            {
                var position = await _gpsService.GetLatestPositionByTruckAsync(truckId);
                if (position == null)
                    return NotFound(new { message = "Aucune position trouvée pour ce camion" });

                return Ok(new
                {
                    position.Id,
                    position.DriverId,
                    position.TruckId,
                    position.Latitude,
                    position.Longitude,
                    position.Timestamp,
                    position.Source
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting latest truck position: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la récupération de la dernière position camion" });
            }
        }

        /// <summary>
        /// Géocoder une adresse (avec cache)
        /// </summary>
        [HttpGet("geocode")]
        public async Task<IActionResult> GeocodeAddress([FromQuery] string address, [FromQuery] bool force = false)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(address))
                    return BadRequest(new { message = "Adresse requise" });

                // Check cache first (unless force = true)
                GeocodingCache? cached = null;
                
                if (!force)
                {
                    cached = await _context.GeocodingCache
                        .FirstOrDefaultAsync(c => c.AddressText.ToLower() == address.ToLower() && c.ExpiresAt > DateTime.UtcNow);
                }

                if (cached != null)
                {
                    _logger.LogInformation($"Using cached geocoding for: {address}");
                    return Ok(new
                    {
                        latitude = cached.Latitude,
                        longitude = cached.Longitude,
                        formattedAddress = cached.FormattedAddress,
                        cached = true
                    });
                }

                // Try multiple search variations - more comprehensive list
                var searchTerms = new List<string>();

                // OPTION 2: Extract city from parentheses and append to full address FIRST
                // "Centre logistique Ariana 9 (Ariana)" -> "Centre logistique Ariana 9, Ariana, Tunisia"
                var cityMatch = System.Text.RegularExpressions.Regex.Match(address, @"\(([^)]+)\)$");
                if (cityMatch.Success)
                {
                    var cityName = cityMatch.Groups[1].Value;
                    // Try full address with city first (MOST LIKELY TO WORK)
                    searchTerms.Add(address + ", " + cityName + ", Tunisia");
                    searchTerms.Add(address + ", " + cityName);
                    
                    // Then try variations
                    searchTerms.Add(address + ", Tunisia");
                    searchTerms.Add(address + ", Tunis, Tunisia");
                    searchTerms.Add(address);
                    
                    // Try city alone
                    searchTerms.Add(cityName + ", Tunisia");
                    searchTerms.Add(cityName);
                    
                    // Also try with number: "Ariana 9, Tunisia"
                    var numberMatch = System.Text.RegularExpressions.Regex.Match(address, @"\d+");
                    if (numberMatch.Success)
                    {
                        var number = numberMatch.Value;
                        searchTerms.Add(cityName + " " + number + ", Tunisia");
                    }
                }
                else
                {
                    // No parentheses, use default order
                    searchTerms.Add(address + ", Tunisia");
                    searchTerms.Add(address + ", Tunis, Tunisia");
                    searchTerms.Add(address);
                }

                // Also try just the city name + "9" format (e.g., "Ariana 9")
                var cityWithNumberMatch = System.Text.RegularExpressions.Regex.Match(address, @"([A-Za-zéèêëàâäùûüôöîï]+)\s*(\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (cityWithNumberMatch.Success)
                {
                    var cityPart = cityWithNumberMatch.Groups[1].Value;
                    var numPart = cityWithNumberMatch.Groups[2].Value;
                    searchTerms.Add(cityPart + " " + numPart + ", Tunisia");
                    searchTerms.Add(cityPart + " " + numPart);
                }
                
                // Also try just the first word if it looks like a city name
                var firstWord = address.Split(' ')[0];
                if (firstWord.Length > 3)
                {
                    searchTerms.Add(firstWord + ", Tunisia");
                }

                NominatimResult? result = null;
                
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("User-Agent", "TransportManagementSystem/1.0 (Transport Management System)");
                httpClient.Timeout = TimeSpan.FromSeconds(30);

                foreach (var searchTerm in searchTerms.Distinct())
                {
                    try
                    {
                        var encodedAddress = Uri.EscapeDataString(searchTerm);
                        var url = $"https://nominatim.openstreetmap.org/search?format=json&q={encodedAddress}&limit=1&countrycodes=tn&addressdetails=1";

                        _logger.LogInformation($"Trying geocoding with: {searchTerm}");

                        var response = await httpClient.GetAsync(url);
                        
                        if (!response.IsSuccessStatusCode)
                        {
                            _logger.LogWarning($"Nominatim API returned {response.StatusCode} for: {searchTerm}");
                            continue;
                        }

                        var content = await response.Content.ReadAsStringAsync();
                        var results = System.Text.Json.JsonSerializer.Deserialize<List<NominatimResult>>(content);
                        
                        if (results != null && results.Count > 0)
                        {
                            result = results[0];
                            _logger.LogInformation($"Found coordinates: {result.Lat}, {result.Lon} for: {searchTerm}");
                            break;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Error with search term '{searchTerm}': {ex.Message}");
                    }
                }

                if (result == null)
                {
                    return NotFound(new { message = "Adresse non trouvée. Essayez une adresse plus précise." });
                }
                
                // Save to cache
                var cacheEntry = new GeocodingCache
                {
                    AddressText = address,
                    Latitude = double.Parse(result.Lat),
                    Longitude = double.Parse(result.Lon),
                    FormattedAddress = result.DisplayName,
                    CachedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddDays(30)
                };
                
                _context.GeocodingCache.Add(cacheEntry);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    latitude = cacheEntry.Latitude,
                    longitude = cacheEntry.Longitude,
                    formattedAddress = cacheEntry.FormattedAddress,
                    cached = false
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error geocoding address: {ex.Message}");
                return StatusCode(500, new { message = $"Erreur lors du géocodage: {ex.Message}" });
            }
        }

        /// <summary>
        /// Calculer la distance entre deux points GPS
        /// </summary>
        [HttpPost("distance")]
        public async Task<IActionResult> CalculateDistance([FromBody] DistanceCalculationDto dto)
        {
            try
            {
                var distance = await _optimisationService.CalculateDistanceAsync(
                    dto.Lat1,
                    dto.Lng1,
                    dto.Lat2,
                    dto.Lng2
                );

                return Ok(new { distance = Math.Round(distance, 2) });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error calculating distance: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors du calcul" });
            }
        }

        /// <summary>
        /// Obtenir la destination d'un voyage par son ID
        /// </summary>
        [HttpGet("trip-destination/{tripId}")]
        public async Task<IActionResult> GetTripDestination(int tripId, [FromQuery] bool forceGeocode = false)
        {
            try
            {
                var trip = await _context.Trips
                    .Include(t => t.Traject)
                        .ThenInclude(tr => tr != null ? tr.Points : null)
                    .FirstOrDefaultAsync(t => t.Id == tripId);

                if (trip == null)
                    return NotFound(new { message = "Voyage non trouvé" });

                string? destinationAddress = null;
                double? destinationLatitude = null;
                double? destinationLongitude = null;
                string? geolocationSource = null;

                // Resolve destination text from traject end point first (selected arrival at trip creation)
                if (trip.Traject != null && trip.Traject.Points != null && trip.Traject.Points.Any())
                {
                    destinationAddress = trip.Traject.Points
                        .OrderByDescending(p => p.Order)
                        .Select(p => p.Location)
                        .FirstOrDefault();
                }

                // If not forcing geocode, trust persisted trip end coordinates first
                if (!forceGeocode && trip.EndLatitude.HasValue && trip.EndLongitude.HasValue)
                {
                    destinationLatitude = trip.EndLatitude.Value;
                    destinationLongitude = trip.EndLongitude.Value;
                    geolocationSource = "Trip End Coordinates";
                }

                // Get destination from the last delivery or from traject (include Location for GPS)
                var deliveries = await _context.Deliveries
                    .Where(d => d.TripId == tripId)
                    .OrderByDescending(d => d.Sequence)
                    .Take(1)
                    .Include(d => d.Location)
                    .ToListAsync();

                if (deliveries.Any())
                {
                    var lastDelivery = deliveries.First();
                    if (string.IsNullOrWhiteSpace(destinationAddress))
                    {
                        destinationAddress = lastDelivery.DeliveryAddress;
                    }
                    
                    _logger.LogInformation($"Delivery address: {destinationAddress}");
                    
                    // PRIORITY 1: Check if delivery has Location with coordinates (most reliable)
                    if (!destinationLatitude.HasValue && !destinationLongitude.HasValue &&
                        lastDelivery.Location != null && lastDelivery.Location.Latitude.HasValue && lastDelivery.Location.Longitude.HasValue)
                    {
                        destinationLatitude = lastDelivery.Location.Latitude;
                        destinationLongitude = lastDelivery.Location.Longitude;
                        geolocationSource = "Location table";
                        _logger.LogInformation($"Using coordinates from Location: {destinationLatitude}, {destinationLongitude}");
                    }
                    // PRIORITY 2: Check if delivery has Geolocation field with coordinates
                    else if (!destinationLatitude.HasValue && !destinationLongitude.HasValue && !string.IsNullOrWhiteSpace(lastDelivery.Geolocation))
                    {
                        var geoParts = lastDelivery.Geolocation.Split(',');
                        if (geoParts.Length >= 2)
                        {
                            if (double.TryParse(geoParts[0].Trim(), out double lat) && 
                                double.TryParse(geoParts[1].Trim(), out double lng))
                            {
                                destinationLatitude = lat;
                                destinationLongitude = lng;
                                geolocationSource = "Geolocation field";
                                _logger.LogInformation($"Using Geolocation from delivery: {lat}, {lng}");
                            }
                        }
                    }
                }
                else if (trip.Traject != null && trip.Traject.Points != null && trip.Traject.Points.Any())
                {
                    if (string.IsNullOrWhiteSpace(destinationAddress))
                    {
                        var lastPoint = trip.Traject.Points.OrderByDescending(p => p.Order).First();
                        destinationAddress = lastPoint.Location;
                    }
                }

                // Only geocode if we don't have coordinates from Geolocation field
                if (!destinationLatitude.HasValue && !string.IsNullOrWhiteSpace(destinationAddress))
                {
                    // Check cache (unless forceGeocode = true)
                    var cached = !forceGeocode 
                        ? await _context.GeocodingCache
                            .FirstOrDefaultAsync(c => c.AddressText.ToLower() == destinationAddress.ToLower() && c.ExpiresAt > DateTime.UtcNow)
                        : null;

                    if (cached != null)
                    {
                        destinationLatitude = cached.Latitude;
                        destinationLongitude = cached.Longitude;
                        geolocationSource = "Cache";
                    }
                    else
                    {
                        // Try to geocode
                        try
                        {
                            // Same comprehensive search logic as GeocodeAddress - OPTION 2
                            var searchTerms = new List<string>();

                            // Extract city from parentheses and append to full address FIRST
                            var cityMatchDest = System.Text.RegularExpressions.Regex.Match(destinationAddress, @"\(([^)]+)\)$");
                            if (cityMatchDest.Success)
                            {
                                var cityNameDest = cityMatchDest.Groups[1].Value;
                                // Try full address with city first (MOST LIKELY TO WORK)
                                searchTerms.Add(destinationAddress + ", " + cityNameDest + ", Tunisia");
                                searchTerms.Add(destinationAddress + ", " + cityNameDest);
                                
                                // Then try variations
                                searchTerms.Add(destinationAddress + ", Tunisia");
                                searchTerms.Add(destinationAddress + ", Tunis, Tunisia");
                                searchTerms.Add(destinationAddress);
                                
                                // Try city alone
                                searchTerms.Add(cityNameDest + ", Tunisia");
                                searchTerms.Add(cityNameDest);
                                
                                // Also try with number: "Ariana 9, Tunisia"
                                var numberMatchDest = System.Text.RegularExpressions.Regex.Match(destinationAddress, @"\d+");
                                if (numberMatchDest.Success)
                                {
                                    var number = numberMatchDest.Value;
                                    searchTerms.Add(cityNameDest + " " + number + ", Tunisia");
                                }
                            }
                            else
                            {
                                // No parentheses, use default order
                                searchTerms.Add(destinationAddress + ", Tunisia");
                                searchTerms.Add(destinationAddress + ", Tunis, Tunisia");
                                searchTerms.Add(destinationAddress);
                            }
                            
                            // Also try just the city name + "9" format (e.g., "Ariana 9")
                            var cityWithNumberMatchDest = System.Text.RegularExpressions.Regex.Match(destinationAddress, @"([A-Za-zéèêëàâäùûüôöîï]+)\s*(\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                            if (cityWithNumberMatchDest.Success)
                            {
                                var cityPart = cityWithNumberMatchDest.Groups[1].Value;
                                var numPart = cityWithNumberMatchDest.Groups[2].Value;
                                searchTerms.Add(cityPart + " " + numPart + ", Tunisia");
                                searchTerms.Add(cityPart + " " + numPart);
                            }
                            
                            var firstWordDest = destinationAddress.Split(' ')[0];
                            if (firstWordDest.Length > 3)
                            {
                                searchTerms.Add(firstWordDest + ", Tunisia");
                            }

                            using var httpClient = new HttpClient();
                            httpClient.DefaultRequestHeaders.Add("User-Agent", "TransportManagementSystem/1.0 (Transport Management System)");
                            httpClient.Timeout = TimeSpan.FromSeconds(30);

                            NominatimResult? result = null;

                            foreach (var searchTerm in searchTerms.Distinct())
                            {
                                var encodedAddress = Uri.EscapeDataString(searchTerm);
                                var url = $"https://nominatim.openstreetmap.org/search?format=json&q={encodedAddress}&limit=1&countrycodes=tn&addressdetails=1";

                                _logger.LogInformation($"Geocoding destination with: {searchTerm}");

                                var response = await httpClient.GetAsync(url);
                                if (response.IsSuccessStatusCode)
                                {
                                    var content = await response.Content.ReadAsStringAsync();
                                    var results = System.Text.Json.JsonSerializer.Deserialize<List<NominatimResult>>(content);
                                    if (results != null && results.Count > 0)
                                    {
                                        result = results[0];
                                        _logger.LogInformation($"Found coordinates: {result.Lat}, {result.Lon}");
                                        break;
                                    }
                                }
                            }

                            if (result != null)
                            {
                                destinationLatitude = double.Parse(result.Lat);
                                destinationLongitude = double.Parse(result.Lon);
                                geolocationSource = "Nominatim API";

                                // Cache the result
                                var cacheEntry = new GeocodingCache
                                {
                                    AddressText = destinationAddress,
                                    Latitude = destinationLatitude.Value,
                                    Longitude = destinationLongitude.Value,
                                    FormattedAddress = result.DisplayName,
                                    CachedAt = DateTime.UtcNow,
                                    ExpiresAt = DateTime.UtcNow.AddDays(30)
                                };
                                _context.GeocodingCache.Add(cacheEntry);
                                await _context.SaveChangesAsync();
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning($"Could not geocode destination: {ex.Message}");
                        }
                    }
                }

                return Ok(new
                {
                    tripId = trip.Id,
                    destinationAddress = destinationAddress,
                    destinationLatitude = destinationLatitude,
                    destinationLongitude = destinationLongitude,
                    geolocationSource = geolocationSource
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting trip destination: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la récupération" });
            }
        }

        /// <summary>
        /// Vider le cache de géocodage
        /// </summary>
        [HttpDelete("geocode-cache")]
        public async Task<IActionResult> ClearGeocodeCache()
        {
            try
            {
                var count = await _context.GeocodingCache.CountAsync();
                _context.GeocodingCache.RemoveRange(_context.GeocodingCache);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Cache vidé: {count} entrées supprimées" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error clearing geocode cache: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors du vidage du cache" });
            }
        }

        /// <summary>
        /// Mettre à jour les coordonnées de destination d'un voyage
        /// </summary>
        [HttpPut("trip-destination/{tripId}")]
        public async Task<IActionResult> UpdateTripDestination(int tripId, [FromBody] TripDestinationDto dto)
        {
            try
            {
                var trip = await _context.Trips.FindAsync(tripId);
                if (trip == null)
                    return NotFound(new { message = "Voyage non trouvé" });

                // Save destination coordinates
                trip.EndLatitude = dto.Latitude;
                trip.EndLongitude = dto.Longitude;

                // Also update the destination address if provided
                if (!string.IsNullOrWhiteSpace(dto.Address))
                {
                    // Try to find and update the last delivery's address
                    var lastDelivery = await _context.Deliveries
                        .Where(d => d.TripId == tripId)
                        .OrderByDescending(d => d.Sequence)
                        .FirstOrDefaultAsync();

                    if (lastDelivery != null)
                    {
                        if (string.IsNullOrWhiteSpace(lastDelivery.DeliveryAddress))
                        {
                            lastDelivery.DeliveryAddress = dto.Address;
                        }
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation($"✅ Destination coordinates saved for trip {tripId}: {dto.Latitude}, {dto.Longitude}");

                return Ok(new
                {
                    success = true,
                    tripId = tripId,
                    latitude = dto.Latitude,
                    longitude = dto.Longitude,
                    address = dto.Address
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating trip destination: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de la mise à jour" });
            }
        }
    }

    // DTO for updating trip destination
    public class TripDestinationDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Address { get; set; } = string.Empty;
    }

    // Helper class for Nominatim API response
    public class NominatimResult
    {
        public string Lat { get; set; } = "";
        public string Lon { get; set; } = "";
        public string DisplayName { get; set; } = "";
    }

    public class GPSPositionDto
    {
        public int? DriverId { get; set; }
        public int? TruckId { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Source { get; set; }
    }

    public class GPSBatchDto
    {
        public List<GPSPositionDto> Positions { get; set; } = new();
    }

    public class DistanceCalculationDto
    {
        public double Lat1 { get; set; }
        public double Lng1 { get; set; }
        public double Lat2 { get; set; }
        public double Lng2 { get; set; }
    }
}
