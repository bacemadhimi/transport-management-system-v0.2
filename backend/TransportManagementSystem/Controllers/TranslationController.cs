using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TransportManagementSystem.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TranslationController : ControllerBase
{

    private readonly string translationsPath = Path.Combine(Directory.GetCurrentDirectory(), "Translations");

    [HttpGet("{lang}")]
    public IActionResult GetAll(string lang)
    {
        var filePath = Path.Combine(translationsPath, $"{lang}.json");

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = $"Language file '{lang}.json' not found." });

        var json = System.IO.File.ReadAllText(filePath);

        var translations = JsonNode.Parse(json);

        return Ok(translations);
    }


    [HttpGet("{lang}/{key}")]
    public IActionResult Get(string lang, string key)
    {
        var filePath = Path.Combine(translationsPath, $"{lang}.json");

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = $"Language file '{lang}.json' not found." });

        var json = System.IO.File.ReadAllText(filePath);
        var translations = JsonSerializer.Deserialize<Dictionary<string, string>>(json);

        if (translations != null && translations.ContainsKey(key))
        {
            return Ok(new { translation = translations[key] });
        }

        return NotFound(new { message = $"Translation for '{key}' not found in '{lang}.json'." });
    }
}