using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderSettingsController : ControllerBase
{
    // Paramètres par défaut (en mémoire - à remplacer par une vraie table DB si besoin)
    private static OrderSettings _settings = new OrderSettings
    {
        AllowEditOrder = true
    };

    [HttpGet]
    public ActionResult<OrderSettings> GetSettings()
    {
        return Ok(_settings);
    }

    [HttpPut]
    public ActionResult<OrderSettings> UpdateSettings([FromBody] OrderSettings settings)
    {
        _settings = settings;
        return Ok(_settings);
    }
}

public class OrderSettings
{
    [JsonPropertyName("allowEditOrder")]
    public bool AllowEditOrder { get; set; }
}
