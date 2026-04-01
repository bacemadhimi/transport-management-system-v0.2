// Hubs/ChatHub.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private static readonly Dictionary<int, string> _userConnections = new();
    private static readonly Dictionary<int, DateTime> _userLastSeen = new();
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ApplicationDbContext context, ILogger<ChatHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
        {
            // Get the connected user info
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                _userConnections[userId] = Context.ConnectionId;
                _userLastSeen[userId] = DateTime.UtcNow;

                // Notify all other connected users that this user is online
                await Clients.Others.SendAsync("UserOnline", userId, user.Name);

                // Send unread messages count to this user
                var unreadCount = await _context.ChatMessages
                    .CountAsync(m => m.ReceiverId == userId.ToString() && !m.IsRead);
                await Clients.Client(Context.ConnectionId)
                    .SendAsync("UnreadCount", unreadCount);

                _logger.LogInformation($"User {userId} connected. Total online users: {_userConnections.Count}");
            }
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var userId = _userConnections.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
        if (userId != 0)
        {
            _userConnections.Remove(userId);
            _userLastSeen[userId] = DateTime.UtcNow;

            // Notify all other users that this user is offline
            await Clients.Others.SendAsync("UserOffline", userId);

            _logger.LogInformation($"User {userId} disconnected. Online users: {_userConnections.Count}");
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(ChatMessage message)
    {
        try
        {
            message.Timestamp = DateTime.UtcNow;

            // Parse string IDs to int for validation
            if (!int.TryParse(message.SenderId, out int senderId) ||
                !int.TryParse(message.ReceiverId, out int receiverId))
            {
                _logger.LogWarning("Invalid user ID format");
                return;
            }

            // Get sender info if not provided
            if (string.IsNullOrEmpty(message.SenderName))
            {
                var sender = await _context.Users.FindAsync(senderId);
                message.SenderName = sender?.Name ?? sender?.Name ?? "Unknown User";
            }

            // Save to database
            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            // Prepare message for sending
            var messageToSend = new
            {
                message.Id,
                message.SenderId,
                message.SenderName,
                message.ReceiverId,
                message.Message,
                Timestamp = message.Timestamp,
                message.IsRead,
                message.TripId,
                message.MessageType,
                message.AttachmentUrl
            };

            // Send to receiver if online
            if (_userConnections.TryGetValue(receiverId, out string connectionId))
            {
                await Clients.Client(connectionId).SendAsync("ReceiveMessage", messageToSend);
            }

            // Send confirmation to sender
            await Clients.Caller.SendAsync("MessageSent", messageToSend);

            _logger.LogInformation($"Message sent from user {senderId} to user {receiverId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message");
            throw;
        }
    }

    public async Task MarkMessageAsRead(int messageId)
    {
        try
        {
            var message = await _context.ChatMessages.FindAsync(messageId);
            var currentUserId = GetCurrentUserId();

            if (message != null && message.ReceiverId == currentUserId.ToString() && !message.IsRead)
            {
                message.IsRead = true;
                await _context.SaveChangesAsync();

                await Clients.Caller.SendAsync("MessageRead", messageId);

                // Notify sender that message was read
                if (int.TryParse(message.SenderId, out int senderId) &&
                    _userConnections.TryGetValue(senderId, out string senderConnectionId))
                {
                    await Clients.Client(senderConnectionId).SendAsync("MessageDelivered", messageId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking message as read");
        }
    }

    public async Task GetConversation(int otherUserId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var currentUserIdStr = currentUserId.ToString();
            var otherUserIdStr = otherUserId.ToString();

            var messages = await _context.ChatMessages
                .Where(m => (m.SenderId == currentUserIdStr && m.ReceiverId == otherUserIdStr) ||
                           (m.SenderId == otherUserIdStr && m.ReceiverId == currentUserIdStr))
                .OrderByDescending(m => m.Timestamp)
                .Take(100)
                .OrderBy(m => m.Timestamp)
                .ToListAsync();

            // Mark received messages as read
            var unreadMessages = messages.Where(m => m.ReceiverId == currentUserIdStr && !m.IsRead);
            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
            }

            if (unreadMessages.Any())
            {
                await _context.SaveChangesAsync();
            }

            await Clients.Caller.SendAsync("LoadConversation", messages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading conversation");
        }
    }

    // Hubs/ChatHub.cs

    public async Task GetOnlineUsers()
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            _logger.LogInformation($"GetOnlineUsers called by user: {currentUserId}");

            var onlineUserIds = _userConnections.Keys.Where(id => id != currentUserId).ToList();
            _logger.LogInformation($"Online user IDs (excluding current): {string.Join(", ", onlineUserIds)}");

            if (!onlineUserIds.Any())
            {
                _logger.LogInformation("No online users found");
                await Clients.Caller.SendAsync("OnlineUsers", new List<object>());
                return;
            }

            // First, get the users from database WITHOUT the LastSeen info
            var users = await _context.Users
                .Where(u => onlineUserIds.Contains(u.Id))
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email
                })
                .ToListAsync();

            // Then, add the LastSeen info on the client side (in memory)
            var onlineUsers = users.Select(u => new
            {
                UserId = u.Id,
                UserName = u.Name,
                IsOnline = true,
                LastSeen = _userLastSeen.ContainsKey(u.Id) ? _userLastSeen[u.Id] : (DateTime?)null,
                Email = u.Email
            }).ToList();

            _logger.LogInformation($"Sending {onlineUsers.Count} online users to caller");
            await Clients.Caller.SendAsync("OnlineUsers", onlineUsers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting online users");
        }
    }

    public async Task SendTyping(int receiverId, bool isTyping)
    {
        var senderId = GetCurrentUserId();

        if (_userConnections.TryGetValue(receiverId, out string connectionId))
        {
            await Clients.Client(connectionId).SendAsync("UserTyping", senderId, isTyping);
        }
    }

    public async Task MarkAllMessagesAsRead(int senderUserId)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var currentUserIdStr = currentUserId.ToString();
            var senderUserIdStr = senderUserId.ToString();

            var unreadMessages = await _context.ChatMessages
                .Where(m => m.SenderId == senderUserIdStr && m.ReceiverId == currentUserIdStr && !m.IsRead)
                .ToListAsync();

            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
            }

            await _context.SaveChangesAsync();

            await Clients.Caller.SendAsync("AllMessagesRead", senderUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all messages as read");
        }
    }

    public async Task GetUnreadMessagesCount()
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var currentUserIdStr = currentUserId.ToString();

            var unreadCounts = await _context.ChatMessages
                .Where(m => m.ReceiverId == currentUserIdStr && !m.IsRead)
                .GroupBy(m => m.SenderId)
                .Select(g => new { SenderId = g.Key, Count = g.Count() })
                .ToListAsync();

            await Clients.Caller.SendAsync("UnreadCounts", unreadCounts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread counts");
        }
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out int userId))
        {
            return userId;
        }
        return 0;
    }
}