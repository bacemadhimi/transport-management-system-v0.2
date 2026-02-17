using System.ComponentModel.DataAnnotations;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public class OrderDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerMatricule { get; set; }

    public string CustomerCity { get; set; }

    public int? ZoneId { get; set; }          
    public string? ZoneName { get; set; }     

    public string Reference { get; set; } = string.Empty;
    public string? Type { get; set; }
    public decimal Weight { get; set; }

    public string WeightUnit { get; set; } 
    public OrderStatus Status { get; set; }
    public DateTime CreatedDate { get; set; }

    public DateTime? DeliveryDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; }
    public bool HasDelivery { get; set; }
    public string SourceSystem { get; set; }
}

public class OrderDetailsDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerMatricule { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string? Type { get; set; }
    public decimal Weight { get; set; }
    public string WeightUnit { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedDate { get; set; }

    public DateTime? DeliveryDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; }
}

public class CreateOrderDto
{
    public int CustomerId { get; set; }
    public string? Reference { get; set; }
    public string? CustomerCity { get; set; }
    public string? Type { get; set; }
    public decimal Weight { get; set; }
    public string WeightUnit { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; } = 5;
}
public class UpdateOrderDto
{
    public int? CustomerId { get; set; }

    public string? Reference { get; set; }
    public string? CustomerCity { get; set; }
    public string? Type { get; set; }
    public decimal Weight { get; set; }
      public string WeightUnit { get; set; } 
    public OrderStatus Status { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? Notes { get; set; }
    public int Priority { get; set; } = 5;
}
public class UpdateOrdersStatusDto
{
    public int[] OrderIds { get; set; }
    public OrderStatus Status { get; set; }
}