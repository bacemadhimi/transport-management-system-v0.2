using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehouseController : ControllerBase
{
    [HttpGet("PaginationAndSearch")]
    public IActionResult GetWarehouses()
    {
        // Temporarily disabled - PlantIt entities not available
        return Ok(new { message = "Warehouse endpoint temporarily disabled" });
    }

    [HttpGet("{key}")]
    public IActionResult GetWarehouseDetails(int key)
    {
        // Temporarily disabled - PlantIt entities not available
        return Ok(new { message = "Warehouse details endpoint temporarily disabled" });
    }

    [HttpGet("GetAllProcessUnitClasses")]
    public IActionResult GetAllProcessUnitClasses()
    {
        // Temporarily disabled - PlantIt entities not available
        return Ok(new { message = "Process unit classes endpoint temporarily disabled" });
    }
}
