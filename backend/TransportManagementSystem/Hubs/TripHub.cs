
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using TransportManagementSystem.Models;

namespace TransportManagementSystem.Hubs;

[Authorize]
public class TripHub : Hub
{
    // Join a specific trip group to receive updates for that trip
    public async Task JoinTripGroup(int tripId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"trip-{tripId}");
    }

    // Leave a trip group
    public async Task LeaveTripGroup(int tripId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"trip-{tripId}");
    }

    // Join all trips group for broadcast notifications
    public async Task JoinAllTripsGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "all-trips");
    }

    // Leave all trips group
    public async Task LeaveAllTripsGroup()
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "all-trips");
    }

    // Send notification to all connected clients
    public async Task SendNotificationToAll(TripNotificationDto notification)
    {
        await Clients.All.SendAsync("ReceiveNotification", notification);
    }

    // Send notification to specific user
    public async Task SendNotificationToUser(string userId, TripNotificationDto notification)
    {
        await Clients.User(userId).SendAsync("ReceiveNotification", notification);
    }

    // Send notification to users with specific roles
    public async Task SendNotificationToRole(string role, TripNotificationDto notification)
    {
        await Clients.Group($"role-{role}").SendAsync("ReceiveNotification", notification);
    }

    // Send trip assignment notification
    public async Task SendTripAssignment(int driverId, object tripData)
    {
        await Clients.User(driverId.ToString()).SendAsync("TripAssigned", tripData);
    }

    // Override OnConnectedAsync to handle connection
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var roles = Context.User?.FindAll(ClaimTypes.Role)?.Select(c => c.Value);

        // Add user to role-based groups
        if (roles != null)
        {
            foreach (var role in roles)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"role-{role}");
            }
        }

        await base.OnConnectedAsync();
    }

    // Override OnDisconnectedAsync to handle disconnection
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var roles = Context.User?.FindAll(ClaimTypes.Role)?.Select(c => c.Value);

        // Remove user from role-based groups
        if (roles != null)
        {
            foreach (var role in roles)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"role-{role}");
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}