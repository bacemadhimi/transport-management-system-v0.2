
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models
{
    public class SearchOptions
    {
        public string? Search { get; set; }
        public string? Reference { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerCity { get; set; }
        public int? PageIndex { get; set; }
        public int? PageSize { get; set; } = 10;
        public int? EmployeId { get; set; }
        public OrderStatus? Status { get; set; }
        public string? SourceSystem { get; set; }
        public DateTime? DeliveryDateStart { get; set; }
        public DateTime? DeliveryDateEnd { get; set; }

        public int? ZoneId { get; set; }
        public bool? IsLate { get; set; }
        public string? SortField { get; set; }   
        public string? SortDirection { get; set; } = "desc";
        public TripStatus? TripStatus { get; set; }
        public int? TruckId { get; set; }
        public int? DriverId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? ParameterType { get; set; }
    }
    public class PagedData<T>
    {
        public int TotalData { get; set; }
        public List<T> Data { get; set; } = new List<T>();
    }

}
