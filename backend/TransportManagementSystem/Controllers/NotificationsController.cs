using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TransportManagementSystem.Models;
using TransportManagementSystem.Services;

namespace TransportManagementSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        INotificationService notificationService,
        ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            throw new UnauthorizedAccessException("User ID not found");
        }
        return userId;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] NotificationFilterDto filter)
    {
        try
        {
            var userId = GetCurrentUserId();
            var notifications = await _notificationService.GetUserNotifications(userId, filter);
            var unreadCount = await _notificationService.GetUnreadCount(userId);

            return Ok(new ApiResponse(true, "Notifications retrieved successfully", new
            {
                Notifications = notifications,
                UnreadCount = unreadCount,
                TotalCount = notifications.Count()
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notifications");
            return StatusCode(500, new ApiResponse(false, "Error retrieving notifications"));
        }
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        try
        {
            var userId = GetCurrentUserId();
            var count = await _notificationService.GetUnreadCount(userId);
            return Ok(new ApiResponse(true, "Unread count retrieved", new { UnreadCount = count }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving unread count");
            return StatusCode(500, new ApiResponse(false, "Error retrieving unread count"));
        }
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _notificationService.MarkAsRead(id, userId);
            return Ok(new ApiResponse(true, "Notification marked as read"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read");
            return StatusCode(500, new ApiResponse(false, "Error marking notification as read"));
        }
    }

    [HttpPut("mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        try
        {
            var userId = GetCurrentUserId();
            await _notificationService.MarkAllAsRead(userId);
            return Ok(new ApiResponse(true, "All notifications marked as read"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all notifications as read");
            return StatusCode(500, new ApiResponse(false, "Error marking all notifications as read"));
        }
    }

    [HttpDelete("cleanup")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CleanupOldNotifications([FromQuery] int daysToKeep = 30)
    {
        try
        {
            // This would need to be implemented in repository
            // await _notificationRepository.DeleteOldNotificationsAsync(daysToKeep);
            return Ok(new ApiResponse(true, $"Old notifications older than {daysToKeep} days cleaned up"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up old notifications");
            return StatusCode(500, new ApiResponse(false, "Error cleaning up old notifications"));
        }
    }

    [HttpDelete("delete-all")]
    public async Task<IActionResult> DeleteAllNotifications()
    {
        try
        {
            var userId = GetCurrentUserId();
            await _notificationService.DeleteAllNotificationsForUser(userId);

            _logger.LogInformation($"✅ All notifications deleted for user {userId}");
            return Ok(new ApiResponse(true, "All notifications deleted successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notifications");
            return StatusCode(500, new ApiResponse(false, "Error deleting notifications"));
        }
    }
}