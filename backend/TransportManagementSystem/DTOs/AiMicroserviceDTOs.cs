using System.Text.Json.Serialization;

namespace TransportManagementSystem.DTOs
{
    /// <summary>
    /// Requête pour le microservice IA (chat)
    /// </summary>
    public class AiChatRequest
    {
        [JsonPropertyName("question")]
        public string Question { get; set; } = string.Empty;

        [JsonPropertyName("chauffeur_id")]
        public string ChauffeurId { get; set; } = string.Empty;

        [JsonPropertyName("lat")]
        public double? Lat { get; set; }

        [JsonPropertyName("lon")]
        public double? Lon { get; set; }

        [JsonPropertyName("heure")]
        public int? Heure { get; set; }

        [JsonPropertyName("jour_semaine")]
        public int? JourSemaine { get; set; }

        [JsonPropertyName("livraisons_restantes")]
        public List<AiLivraisonRequest> LivraisonsRestantes { get; set; } = new();

        [JsonPropertyName("chauffeurs_disponibles")]
        public List<AiChauffeurRequest> ChauffeursDisponibles { get; set; } = new();

        [JsonPropertyName("camions_disponibles")]
        public List<AiCamionRequest> CamionsDisponibles { get; set; } = new();

        [JsonPropertyName("telemetrie_gps")]
        public List<AiTelemetrieRequest>? TelemetrieGps { get; set; }

        [JsonPropertyName("historique_sequence")]
        public List<List<float>>? HistoriqueSequence { get; set; }
    }

    public class AiLivraisonRequest
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("rue_depart")]
        public string RueDepart { get; set; } = string.Empty;

        [JsonPropertyName("rue_arrivee")]
        public string RueArrivee { get; set; } = string.Empty;

        [JsonPropertyName("heure_min")]
        public string? HeureMin { get; set; }

        [JsonPropertyName("heure_max")]
        public string? HeureMax { get; set; }
    }

    public class AiChauffeurRequest
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("nom")]
        public string Nom { get; set; } = string.Empty;

        [JsonPropertyName("lat")]
        public double? Lat { get; set; }

        [JsonPropertyName("lon")]
        public double? Lon { get; set; }

        [JsonPropertyName("heures_restantes")]
        public double? HeuresRestantes { get; set; }
    }

    public class AiCamionRequest
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("immatriculation")]
        public string Immatriculation { get; set; } = string.Empty;

        [JsonPropertyName("charge_max_kg")]
        public double? ChargeMaxKg { get; set; }

        [JsonPropertyName("volume_max_m3")]
        public double? VolumeMaxM3 { get; set; }

        [JsonPropertyName("est_frigorifique")]
        public bool EstFrigorifique { get; set; }

        [JsonPropertyName("disponible")]
        public bool Disponible { get; set; } = true;
    }

    public class AiTelemetrieRequest
    {
        [JsonPropertyName("vitesse_kmh")]
        public double? VitesseKmh { get; set; }

        [JsonPropertyName("acceleration_m_s2")]
        public double? AccelerationMs2 { get; set; }

        [JsonPropertyName("lat")]
        public double? Lat { get; set; }

        [JsonPropertyName("lon")]
        public double? Lon { get; set; }

        [JsonPropertyName("deviation_itineraire_m")]
        public double? DeviationItineraireM { get; set; }

        [JsonPropertyName("duree_arret_s")]
        public int DureeArretS { get; set; }
    }

    /// <summary>
    /// Réponse du microservice IA
    /// </summary>
    public class AiChatResponse
    {
        [JsonPropertyName("reponse")]
        public string Reponse { get; set; } = string.Empty;

        [JsonPropertyName("carte")]
        public AiCarteResponse? Carte { get; set; }

        [JsonPropertyName("recommandations")]
        public AiRecommandationResponse? Recommandations { get; set; }

        [JsonPropertyName("alertes")]
        public AiAlertResponse? Alertes { get; set; }

        [JsonPropertyName("confiance")]
        public double Confiance { get; set; }

        [JsonPropertyName("duree_ms")]
        public int DureeMs { get; set; }
    }

    public class AiCarteResponse
    {
        [JsonPropertyName("points")]
        public List<AiPointData> Points { get; set; } = new();

        [JsonPropertyName("segments")]
        public List<AiSegmentData> Segments { get; set; } = new();

        [JsonPropertyName("meteo")]
        public Dictionary<string, object>? Meteo { get; set; }

        [JsonPropertyName("incidents")]
        public List<Dictionary<string, object>> Incidents { get; set; } = new();
    }

    public class AiPointData
    {
        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lon")]
        public double Lon { get; set; }

        [JsonPropertyName("intensite")]
        public double Intensite { get; set; }
    }

    public class AiSegmentData
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("couleur")]
        public string Couleur { get; set; } = string.Empty;
    }

    public class AiRecommandationResponse
    {
        [JsonPropertyName("chauffeurs")]
        public List<Dictionary<string, object>> Chauffeurs { get; set; } = new();

        [JsonPropertyName("camions")]
        public List<Dictionary<string, object>> Camions { get; set; } = new();

        [JsonPropertyName("itineraire_optimal")]
        public Dictionary<string, object>? ItineraireOptimal { get; set; }
    }

    public class AiAlertResponse
    {
        [JsonPropertyName("anomalie")]
        public Dictionary<string, object>? Anomalie { get; set; }

        [JsonPropertyName("messages")]
        public List<string> Messages { get; set; } = new();
    }
}
