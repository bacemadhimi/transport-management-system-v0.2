using Microsoft.AspNetCore.Mvc;
using TransportManagementSystem.Services;

[ApiController]
[Route("api/sync")]
public class SyncController : ControllerBase
{
    private readonly OrderSyncService _syncService;

    public SyncController(OrderSyncService syncService)
    {
        _syncService = syncService;
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start()
    {
        var history = await _syncService.SyncSalesOrdersAsync();
        return Ok(history);
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        var last = await _syncService.GetLastSyncAsync();
        return Ok(last);
    }

    [HttpGet("history")]
    public async Task<IActionResult> History()
    {
        var history = await _syncService.GetAllHistoryAsync();
        return Ok(history);
    }
}
