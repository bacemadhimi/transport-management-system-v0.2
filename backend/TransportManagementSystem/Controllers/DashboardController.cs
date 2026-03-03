using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        //[Authorize(Roles = "Admin")]
        public async Task<IActionResult> TotalData()
        {
            var result = new
            {
                userCount = await _context.Users.AsNoTracking().CountAsync(),
                driverCount = await _context.Employees.OfType<Driver>().AsNoTracking().CountAsync(),
                truckCount = await _context.Trucks.AsNoTracking().CountAsync(),
                tripCount = await _context.Trips.AsNoTracking().CountAsync(),
                orderCount = await _context.Orders.AsNoTracking().CountAsync()
            };

            return Ok(result);
        }

        [HttpGet("trips-by-truck")]
        //[Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTripsByTruck()
        {
            var result = await _context.Trips
                .AsNoTracking()
                .GroupBy(t => new { t.TruckId, t.Truck.Immatriculation })
                .Select(g => new
                {
                    TruckId = g.Key.TruckId,
                    TruckImmatriculation = g.Key.Immatriculation ?? "Non assigné",
                    TripCount = g.Count()
                })
                .OrderByDescending(x => x.TripCount)
                .ToListAsync();

            return Ok(result);
        }


        [HttpGet("today-trips")]
        public async Task<IActionResult> GetTodayTrips()
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var trips = await _context.Trips
                .AsNoTracking()
                .Where(t =>
                    t.EstimatedStartDate.HasValue &&
                    t.EstimatedStartDate >= today &&
                    t.EstimatedStartDate < tomorrow)
                .Select(t => new
                {
                    TripId = t.Id,
                    t.BookingId,
                    t.TripReference,
                    TripStatus = t.TripStatus.ToString(),

                    DriverId = t.DriverId,
                    DriverName = t.Driver != null ? t.Driver.Name : "Non assigné",

                    TruckId = t.TruckId,
                    TruckImmatriculation = t.Truck != null
                        ? t.Truck.Immatriculation
                        : "Non assigné",

                    DeliveryCount = t.Deliveries.Count(),

                    DeliveredCount = t.Deliveries
                        .Count(d => d.Status == Delivery.DeliveryStatus.Delivered),

                    CustomerCount = t.Deliveries
                        .Select(d => d.CustomerId)
                        .Distinct()
                        .Count(),

                    t.EstimatedStartDate,
                    t.EstimatedEndDate,
                    t.ActualStartDate,
                    t.ActualEndDate,
                    t.EstimatedDistance,
                    t.EstimatedDuration
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                count = trips.Count,
                date = today.ToString("yyyy-MM-dd"),
                data = trips
            });
        }


        [HttpGet("orders-by-status")]
        //[Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOrdersByStatus()
        {
            var result = await _context.Orders
                .AsNoTracking()
                .GroupBy(o => o.Status)
                .Select(g => new
                {
                    Status = g.Key.ToString(),
                    Count = g.Count()
                })
                .ToListAsync();

            return Ok(result);
        }


        [HttpGet("trips-by-status")]
        public async Task<IActionResult> GetTripsByStatus()
        {
            var result = await _context.Trips
                .AsNoTracking()
                .GroupBy(t => t.TripStatus)
                .Select(g => new
                {
                    Status = g.Key.ToString(),
                    Count = g.Count()
                })
                .ToListAsync();

            return Ok(result);
        }
    }
}
