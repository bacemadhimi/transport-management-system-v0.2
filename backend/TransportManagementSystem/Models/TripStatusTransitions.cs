using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public static class TripStatusTransitions
{
    public static readonly Dictionary<TripStatus, List<TripStatus>> ValidTransitions = new()
    {
        [TripStatus.Planned] = new() { TripStatus.Accepted, TripStatus.Cancelled },
        [TripStatus.Accepted] = new() { TripStatus.LoadingInProgress, TripStatus.Cancelled },
        [TripStatus.LoadingInProgress] = new() { TripStatus.DeliveryInProgress, TripStatus.Cancelled },
        [TripStatus.DeliveryInProgress] = new() { TripStatus.Receipt, TripStatus.Cancelled },
        [TripStatus.Receipt] = new() { }, // End state - Réception
        [TripStatus.Cancelled] = new() { } // End state - Annulé
    };

    public static bool IsValidTransition(TripStatus current, TripStatus next)
    {
       
        if (current == next)
            return true;

        return ValidTransitions.ContainsKey(current) &&
               ValidTransitions[current].Contains(next);
    }

    public static string GetStatusLabel(TripStatus status)
    {
        return status switch
        {
            TripStatus.Planned => "Planifié",
            TripStatus.Accepted => "Accepté",
            TripStatus.LoadingInProgress => "En cours de chargement",
            TripStatus.DeliveryInProgress => "En cours de livraison",
            TripStatus.Receipt => "Réception",
            TripStatus.Cancelled => "Annulé",
            _ => "Inconnu"
        };
    }

    public static string GetStatusDescription(TripStatus status)
    {
        return status switch
        {
            TripStatus.Planned => "Voyage planifié par l'opérateur",
            TripStatus.Accepted => "Voyage accepté par le chauffeur",
            TripStatus.LoadingInProgress => "Chargement en cours",
            TripStatus.DeliveryInProgress => "Livraison en cours",
            TripStatus.Receipt => "Livraison complétée",
            TripStatus.Cancelled => "Voyage annulé",
            _ => "Statut inconnu"
        };
    }

    public static bool CanAdvanceStatus(TripStatus currentStatus, int totalDeliveries, int completedDeliveries)
    {
        switch (currentStatus)
        {
            case TripStatus.Planned:
                // Can advance to Accepted (basic validation done elsewhere)
                return true;

            case TripStatus.Accepted:
                // Can advance to LoadingInProgress
                return true;

            case TripStatus.LoadingInProgress:
                // Can advance to DeliveryInProgress
                return true;

            case TripStatus.DeliveryInProgress:
                // Can advance to Receipt only if all deliveries are completed
                return totalDeliveries > 0 && completedDeliveries == totalDeliveries;

            case TripStatus.Receipt:
            case TripStatus.Cancelled:
                // End states, cannot advance
                return false;

            default:
                return false;
        }
    }

    public static TripStatus GetNextStatus(TripStatus currentStatus)
    {
        return currentStatus switch
        {
            TripStatus.Planned => TripStatus.Accepted,
            TripStatus.Accepted => TripStatus.LoadingInProgress,
            TripStatus.LoadingInProgress => TripStatus.DeliveryInProgress,
            TripStatus.DeliveryInProgress => TripStatus.Receipt,
            _ => currentStatus
        };
    }
}