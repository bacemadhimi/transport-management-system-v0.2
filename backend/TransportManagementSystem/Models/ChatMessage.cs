namespace TransportManagementSystem.Models;

public class ChatMessage
{
    public string Role { get; set; } = "user"; // "user", "assistant", "system"
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class ChatRequest
{
    public int DriverId { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<ChatMessage>? ConversationHistory { get; set; }
}

public class ChatResponse
{
    public string Message { get; set; } = string.Empty;
    public string? Source { get; set; }
    public bool IsConfident { get; set; } = true;
    public Dictionary<string, object>? Context { get; set; }
}

public class KnowledgeBase
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // "General", "Safety", "Procedure", "FAQ"
    public List<string> Keywords { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
