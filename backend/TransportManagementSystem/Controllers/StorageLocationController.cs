using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StorageLocationController : ControllerBase
{
    [HttpGet]
    public IActionResult GetStorageLocations()
    {
        // Temporarily disabled - PlantIt entities not available
        return Ok(new { message = "Storage location endpoint temporarily disabled" });
    }
}
