using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Models;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using TransportManagementSystem.Hubs;

namespace TransportManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GPSController : ControllerBase
    {
        private readonly ILogger<GPSController> _logger;
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<GPSHub> _gpsHub;
        private readonly IHubContext<NotificationHub> _notificationHub;

        public GPSController(
            ILogger<GPSController> logger,
            ApplicationDbContext context,
            IHubContext<GPSHub> gpsHub,
            IHubContext<NotificationHub> notificationHub)
        {
            _logger = logger;
            _context = context;
            _gpsHub = gpsHub;
            _notificationHub = notificationHub;
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

                var position = await SavePositionAsync(
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
                    await SavePositionAsync(
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

                var positions = await _context.PositionsGPS
                    .OrderByDescending(p => p.Timestamp)
                    .Take(limit)
                    .ToListAsync();

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
                var query = _context.PositionsGPS.Where(p => p.DriverId == driverId);
                
                if (startDate.HasValue)
                    query = query.Where(p => p.Timestamp >= startDate.Value);
                
                if (endDate.HasValue)
                    query = query.Where(p => p.Timestamp <= endDate.Value);
                
                var positions = await query.OrderByDescending(p => p.Timestamp).ToListAsync();
                
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
                var query = _context.PositionsGPS.Where(p => p.TruckId == truckId);
                
                if (startDate.HasValue)
                    query = query.Where(p => p.Timestamp >= startDate.Value);
                
                if (endDate.HasValue)
                    query = query.Where(p => p.Timestamp <= endDate.Value);
                
                var positions = await query.OrderByDescending(p => p.Timestamp).ToListAsync();
                
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
                var position = await _context.PositionsGPS
                    .Where(p => p.DriverId == driverId)
                    .OrderByDescending(p => p.Timestamp)
                    .FirstOrDefaultAsync();
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
                var position = await _context.PositionsGPS
                    .Where(p => p.TruckId == truckId)
                    .OrderByDescending(p => p.Timestamp)
                    .FirstOrDefaultAsync();
                    
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
                var distance = CalculateDistance(
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
        /// Calculate distance between two points using Haversine formula
        /// </summary>
        private double CalculateDistance(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6371; // Earth's radius in km
            var dLat = ToRad(lat2 - lat1);
            var dLng = ToRad(lng2 - lng1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                    Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private double ToRad(double degrees)
        {
            return degrees * Math.PI / 180;
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

        /// <summary>
        /// Accepter un voyage par le chauffeur
        /// </summary>
        [HttpPost("trip/{tripId}/accept")]
        public async Task<IActionResult> AcceptTrip(int tripId)
        {
            try
            {
                var trip = await _context.Trips
                    .Include(t => t.Driver)
                    .Include(t => t.Truck)
                    .FirstOrDefaultAsync(t => t.Id == tripId);

                if (trip == null)
                    return NotFound(new { message = "Voyage non trouvé" });

                if (trip.TripStatus != Entity.TripStatus.Planned)
                    return BadRequest(new { message = "Le voyage ne peut plus être accepté" });

                trip.TripStatus = Entity.TripStatus.Accepted;
                trip.Driver.Status = "En mission";

                await _context.SaveChangesAsync();

                // Create notification entity
                var notificationData = new
                {
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    DriverId = trip.DriverId,
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    Status = "Accepted",
                    Timestamp = DateTime.UtcNow
                };

                var dbNotification = new Notification
                {
                    Type = "TRIP_ACCEPTED",
                    Title = "✅ Mission Acceptée",
                    Message = $"Le chauffeur {trip.Driver?.Name} a accepté la mission {trip.TripReference}",
                    Timestamp = DateTime.UtcNow,
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    NewStatus = "Accepted",
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    AdditionalData = System.Text.Json.JsonSerializer.Serialize(notificationData),
                    CreatedAt = DateTime.UtcNow
                };

                await NotifyAdminsAsync(dbNotification, new
                {
                    type = "TRIP_ACCEPTED",
                    tripId = tripId,
                    tripReference = trip.TripReference,
                    driverId = trip.DriverId,
                    driverName = trip.Driver?.Name,
                    title = "Voyage Accepté",
                    message = $"Le chauffeur {trip.Driver?.Name} a accepté le voyage {trip.TripReference}",
                    status = "Accepted",
                    timestamp = DateTime.UtcNow
                });

                Console.WriteLine($"✅ Voyage {trip.TripReference} accepté par le chauffeur {trip.Driver?.Name}");

                return Ok(new { message = "Voyage accepté avec succès", trip = new { trip.Id, trip.TripReference, trip.TripStatus } });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error accepting trip: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de l'acceptation" });
            }
        }

        /// <summary>
        /// Refuser un voyage par le chauffeur
        /// </summary>
        [HttpPost("trip/{tripId}/reject")]
        public async Task<IActionResult> RejectTrip(int tripId, [FromBody] RejectTripDto dto)
        {
            try
            {
                var trip = await _context.Trips
                    .Include(t => t.Driver)
                    .Include(t => t.Truck)
                    .FirstOrDefaultAsync(t => t.Id == tripId);

                if (trip == null)
                    return NotFound(new { message = "Voyage non trouvé" });

                if (trip.TripStatus != Entity.TripStatus.Planned)
                    return BadRequest(new { message = "Le voyage ne peut plus être refusé" });

                trip.TripStatus = Entity.TripStatus.Refused;
                trip.Driver.Status = "Disponible";
                trip.Message = dto.Reason;

                await _context.SaveChangesAsync();

                // Create notification entity
                var notificationData = new
                {
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    DriverId = trip.DriverId,
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    Reason = dto.Reason,
                    ReasonCode = dto.ReasonCode,
                    Status = "Refused",
                    Timestamp = DateTime.UtcNow
                };

                var dbNotification = new Notification
                {
                    Type = "TRIP_REJECTED",
                    Title = "❌ Mission Refusée",
                    Message = $"Le chauffeur {trip.Driver?.Name} a refusé la mission {trip.TripReference}. Raison: {dto.Reason}",
                    Timestamp = DateTime.UtcNow,
                    TripId = tripId,
                    TripReference = trip.TripReference,
                    NewStatus = "Refused",
                    DriverName = trip.Driver?.Name,
                    TruckImmatriculation = trip.Truck?.Immatriculation,
                    AdditionalData = System.Text.Json.JsonSerializer.Serialize(notificationData),
                    CreatedAt = DateTime.UtcNow
                };

                await NotifyAdminsAsync(dbNotification, new
                {
                    type = "TRIP_REJECTED",
                    tripId = tripId,
                    tripReference = trip.TripReference,
                    driverId = trip.DriverId,
                    driverName = trip.Driver?.Name,
                    truckImmatriculation = trip.Truck?.Immatriculation,
                    title = "Voyage Refusé",
                    message = $"Le chauffeur {trip.Driver?.Name} a refusé le voyage {trip.TripReference}. Raison: {dto.Reason}",
                    reason = dto.Reason,
                    reasonCode = dto.ReasonCode,
                    status = "Refused",
                    timestamp = DateTime.UtcNow
                });

                Console.WriteLine($"❌ Voyage {trip.TripReference} refusé par le chauffeur {trip.Driver?.Name} - Raison: {dto.Reason}");

                return Ok(new { message = "Voyage refusé", trip = new { trip.Id, trip.TripReference, trip.TripStatus } });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error rejecting trip: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors du refus" });
            }
        }

        /// <summary>
        /// Helper method to create a notification and send it to all admin users.
        /// Creates Notification entity + UserNotification for each admin, sends SignalR to Admins group.
        /// </summary>
        private async Task NotifyAdminsAsync(Notification notification, object signalRData)
        {
            try
            {
                // Save notification to DB first to get its ID
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync();

                // Get all admin users (by email pattern)
                var allUsers = await _context.Users.ToListAsync();
                var adminUsers = allUsers.Where(u =>
                    u.Email != null && (u.Email.Contains("admin") || u.Email.Contains("super"))
                ).Distinct().ToList();

                // Create UserNotification for each admin
                foreach (var adminUser in adminUsers)
                {
                    var userNotification = new UserNotification
                    {
                        NotificationId = notification.Id,
                        UserId = adminUser.Id,
                        IsRead = false,
                        ReadAt = null
                    };
                    _context.UserNotifications.Add(userNotification);
                }
                await _context.SaveChangesAsync();

                // Send SignalR notification to Admins group (uppercase - consistent)
                await _notificationHub.Clients.Group("Admins").SendAsync("ReceiveNotification", signalRData);

                // Also send to all clients for real-time compatibility
                await _notificationHub.Clients.All.SendAsync("ReceiveNotification", signalRData);

                _logger.LogInformation($"✅ [NotifyAdmins] HTTP Notification {notification.Id} sent to {adminUsers.Count} admins via SignalR");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ [NotifyAdmins] HTTP Failed to notify admins for notification {notification.Id}");
            }
        }

        /// <summary>
        /// Save a GPS position to the database
        /// </summary>
        private async Task<PositionGPS> SavePositionAsync(int? driverId, int? truckId, double latitude, double longitude, string source)
        {
            var position = new PositionGPS
            {
                DriverId = driverId,
                TruckId = truckId,
                Latitude = latitude,
                Longitude = longitude,
                Source = source,
                Timestamp = DateTime.UtcNow
            };

            _context.PositionsGPS.Add(position);
            await _context.SaveChangesAsync();

            // Send real-time update via SignalR
            if (_gpsHub != null)
            {
                await _gpsHub.Clients.All.SendAsync("ReceivePosition", new
                {
                    position.Id,
                    position.DriverId,
                    position.TruckId,
                    position.Latitude,
                    position.Longitude,
                    position.Timestamp
                });
            }

            return position;
        }
    }

    public class RejectTripDto
    {
        public string Reason { get; set; } = string.Empty;
        public string? ReasonCode { get; set; }
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
