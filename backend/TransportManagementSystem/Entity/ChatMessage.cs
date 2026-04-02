namespace TransportManagementSystem.Entity;

public class ChatMessage
{
    public int Id { get; set; }
    public string SenderId { get; set; }
    public string SenderName { get; set; }
    public string ReceiverId { get; set; }
    public string Message { get; set; }
    public DateTime Timestamp { get; set; }
    public bool IsRead { get; set; }
    public int? TripId { get; set; }
    public string MessageType { get; set; } // Text, Image, Location
    public string? AttachmentUrl { get; set; }
}

public class ChatConversation
{
    public string UserId { get; set; }
    public string UserName { get; set; }
    public string LastMessage { get; set; }
    public DateTime LastMessageTime { get; set; }
    public int UnreadCount { get; set; }
    public bool IsOnline { get; set; }
    public string UserRole { get; set; }
}
