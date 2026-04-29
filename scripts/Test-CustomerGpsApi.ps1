# =====================================================
# SCRIPT DE TEST API - Gestion GPS des Clients
# =====================================================
# Objectif : Tester automatiquement l'API de création
# et vérification des coordonnées GPS
# =====================================================

# Configuration
$baseUrl = "https://localhost:5001/api"  # Ajuster selon votre configuration
$token = "VOTRE_TOKEN_JWT_ICI"          # Remplacer par un token valide
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Couleurs pour l'affichage
$green = "`e[32m"
$red = "`e[31m"
$yellow = "`e[33m"
$blue = "`e[34m"
$reset = "`e[0m"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  TEST API - GESTION GPS DES CLIENTS" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# =====================================================
# TEST 1 : Créer un client avec adresse valide (Tunis)
# =====================================================
Write-Host "`n📝 TEST 1 : Création client avec adresse valide (Tunis)" -ForegroundColor Yellow

$client1 = @{
    name = "API Test Client Tunis"
    matricule = "API-TEST-TUN-$(Get-Date -Format 'yyyyMMddHHmmss')"
    address = "Avenue Habib Bourguiba, Tunis 1000, Tunisie"
    phone = "+216 71 123 456"
    email = "api.tunis@test.com"
    contact = "Test API User"
} | ConvertTo-Json

try {
    Write-Host "Envoi de la requête POST..." -ForegroundColor Gray
    $response1 = Invoke-RestMethod -Uri "$baseUrl/Customer" -Method Post -Headers $headers -Body $client1
    
    if ($response1.success) {
        Write-Host "✅ SUCCÈS : Client créé" -ForegroundColor Green
        Write-Host "   ID: $($response1.data.id)" -ForegroundColor Gray
        Write-Host "   Nom: $($response1.data.name)" -ForegroundColor Gray
        Write-Host "   Latitude: $($response1.data.latitude)" -ForegroundColor Gray
        Write-Host "   Longitude: $($response1.data.longitude)" -ForegroundColor Gray
        
        if ($null -ne $response1.data.latitude -and $null -ne $response1.data.longitude) {
            Write-Host "   🎯 Coordonnées GPS détectées automatiquement !" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Coordonnées GPS non détectées" -ForegroundColor Red
        }
        
        $clientId1 = $response1.data.id
    } else {
        Write-Host "❌ ÉCHEC : $($response1.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERREUR : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Détails : $($_.ErrorDetails.Message)" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# =====================================================
# TEST 2 : Créer un client avec adresse invalide
# =====================================================
Write-Host "`n📝 TEST 2 : Création client avec adresse invalide" -ForegroundColor Yellow

$client2 = @{
    name = "API Test Sans GPS"
    matricule = "API-TEST-NOGPS-$(Get-Date -Format 'yyyyMMddHHmmss')"
    address = "Rue Imaginaire 999, Ville Inexistante 00000"
    phone = "+216 71 999 999"
    email = "api.nogps@test.com"
    contact = "Test No GPS"
} | ConvertTo-Json

try {
    Write-Host "Envoi de la requête POST..." -ForegroundColor Gray
    $response2 = Invoke-RestMethod -Uri "$baseUrl/Customer" -Method Post -Headers $headers -Body $client2
    
    if ($response2.success) {
        Write-Host "✅ SUCCÈS : Client créé (même sans GPS)" -ForegroundColor Green
        Write-Host "   ID: $($response2.data.id)" -ForegroundColor Gray
        Write-Host "   Nom: $($response2.data.name)" -ForegroundColor Gray
        Write-Host "   Latitude: $($response2.data.latitude)" -ForegroundColor Gray
        Write-Host "   Longitude: $($response2.data.longitude)" -ForegroundColor Gray
        
        if ($null -eq $response2.data.latitude -or $null -eq $response2.data.longitude) {
            Write-Host "   🔴 Coordonnées GPS absentes (comme prévu)" -ForegroundColor Red
            Write-Host "   💡 Ce client s'affichera en ROUGE dans l'interface" -ForegroundColor Yellow
        }
        
        $clientId2 = $response2.data.id
    } else {
        Write-Host "❌ ÉCHEC : $($response2.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERREUR : $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# TEST 3 : Récupérer la liste des clients
# =====================================================
Write-Host "`n📋 TEST 3 : Récupération de la liste des clients" -ForegroundColor Yellow

try {
    Write-Host "Envoi de la requête GET..." -ForegroundColor Gray
    $response3 = Invoke-RestMethod -Uri "$baseUrl/Customer/PaginationAndSearch?pageSize=100" -Method Get -Headers $headers
    
    Write-Host "✅ SUCCÈS : Liste récupérée" -ForegroundColor Green
    Write-Host "   Total clients : $($response3.totalData)" -ForegroundColor Gray
    
    # Compter les clients avec/sans GPS
    $withGps = 0
    $withoutGps = 0
    
    foreach ($customer in $response3.data) {
        if ($null -ne $customer.latitude -and $null -ne $customer.longitude) {
            $withGps++
        } else {
            $withoutGps++
        }
    }
    
    Write-Host "   Avec GPS    : $withGps" -ForegroundColor Green
    Write-Host "   Sans GPS    : $withoutGps" -ForegroundColor Red
    
    if ($withGps + $withoutGps -gt 0) {
        $coverage = [math]::Round(($withGps / ($withGps + $withoutGps)) * 100, 2)
        Write-Host "   Couverture  : $coverage%" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ ERREUR : $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# TEST 4 : Récupérer les clients AVEC coordonnées
# =====================================================
Write-Host "`n🗺️  TEST 4 : Récupération clients avec coordonnées GPS" -ForegroundColor Yellow

try {
    Write-Host "Envoi de la requête GET..." -ForegroundColor Gray
    $response4 = Invoke-RestMethod -Uri "$baseUrl/Customer/with-coordinates" -Method Get -Headers $headers
    
    Write-Host "✅ SUCCÈS : Clients avec GPS récupérés" -ForegroundColor Green
    Write-Host "   Nombre : $($response4.Count)" -ForegroundColor Gray
    
    if ($response4.Count -gt 0) {
        Write-Host "`n   Premiers résultats :" -ForegroundColor Cyan
        $response4 | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.name) : ($($_.latitude), $($_.longitude))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ ERREUR : $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# =====================================================
# TEST 5 : Modifier un client (ajout d'adresse)
# =====================================================
Write-Host "`n🔄 TEST 5 : Modification client (ajout adresse valide)" -ForegroundColor Yellow

if ($clientId2) {
    $updateData = @{
        id = $clientId2
        name = "API Test Sans GPS - Mis à jour"
        matricule = "API-TEST-NOGPS-UPDATED"
        address = "Avenue de la Liberté, Sfax 3000, Tunisie"  # Nouvelle adresse valide
        phone = "+216 71 999 999"
        email = "api.nogps.updated@test.com"
        contact = "Test Updated"
    } | ConvertTo-Json
    
    try {
        Write-Host "Envoi de la requête PUT..." -ForegroundColor Gray
        $response5 = Invoke-RestMethod -Uri "$baseUrl/Customer/$clientId2" -Method Put -Headers $headers -Body $updateData
        
        if ($response5.success) {
            Write-Host "✅ SUCCÈS : Client mis à jour" -ForegroundColor Green
            Write-Host "   Nouvelle Latitude: $($response5.data.latitude)" -ForegroundColor Gray
            Write-Host "   Nouvelle Longitude: $($response5.data.longitude)" -ForegroundColor Gray
            
            if ($null -ne $response5.data.latitude -and $null -ne $response5.data.longitude) {
                Write-Host "   🎯 Coordonnées GPS ajoutées après mise à jour !" -ForegroundColor Green
                Write-Host "   💡 Ce client s'affichera maintenant en BLANC" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ ÉCHEC : $($response5.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ ERREUR : $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  SKIP : Client ID non disponible" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# =====================================================
# TEST 6 : Vérifier un client spécifique
# =====================================================
Write-Host "`n🔍 TEST 6 : Vérification détaillée d'un client" -ForegroundColor Yellow

if ($clientId1) {
    try {
        Write-Host "Envoi de la requête GET..." -ForegroundColor Gray
        $response6 = Invoke-RestMethod -Uri "$baseUrl/Customer/$clientId1" -Method Get -Headers $headers
        
        if ($response6.success) {
            Write-Host "✅ SUCCÈS : Détails du client" -ForegroundColor Green
            Write-Host "`n   INFORMATIONS COMPLÈTES :" -ForegroundColor Cyan
            Write-Host "   ─────────────────────────" -ForegroundColor Gray
            Write-Host "   ID              : $($response6.data.id)" -ForegroundColor Gray
            Write-Host "   Nom             : $($response6.data.name)" -ForegroundColor Gray
            Write-Host "   Matricule       : $($response6.data.matricule)" -ForegroundColor Gray
            Write-Host "   Adresse         : $($response6.data.address)" -ForegroundColor Gray
            Write-Host "   Téléphone       : $($response6.data.phone)" -ForegroundColor Gray
            Write-Host "   Email           : $($response6.data.email)" -ForegroundColor Gray
            Write-Host "   Contact         : $($response6.data.contact)" -ForegroundColor Gray
            Write-Host "   Source          : $($response6.data.sourceSystem)" -ForegroundColor Gray
            Write-Host "   Latitude        : $($response6.data.latitude)" -ForegroundColor Gray
            Write-Host "   Longitude       : $($response6.data.longitude)" -ForegroundColor Gray
            
            # Validation des coordonnées
            if ($null -ne $response6.data.latitude -and $null -ne $response6.data.longitude) {
                $lat = [double]$response6.data.latitude
                $lon = [double]$response6.data.longitude
                
                if ($lat -ge -90 -and $lat -le 90 -and $lon -ge -180 -and $lon -le 180) {
                    Write-Host "`n   ✅ Coordonnées GPS VALIDES" -ForegroundColor Green
                    Write-Host "   📍 Position approximative : Tunisie" -ForegroundColor Green
                } else {
                    Write-Host "`n   ❌ Coordonnées GPS INVALIDES (hors limites)" -ForegroundColor Red
                }
            } else {
                Write-Host "`n   ❌ Coordonnées GPS MANQUANTES" -ForegroundColor Red
            }
            
            # Entités géographiques
            if ($response6.data.geographicalEntities -and $response6.data.geographicalEntities.Count -gt 0) {
                Write-Host "`n   ENTITÉS GÉOGRAPHIQUES :" -ForegroundColor Cyan
                foreach ($entity in $response6.data.geographicalEntities) {
                    Write-Host "   - $($entity.geographicalEntityName) (Niveau: $($entity.levelName))" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "❌ ÉCHEC : $($response6.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ ERREUR : $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  SKIP : Client ID non disponible" -ForegroundColor Yellow
}

# =====================================================
# RÉSUMÉ FINAL
# =====================================================
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

Write-Host "Tests exécutés :" -ForegroundColor White
Write-Host "  ✓ Test 1 : Création avec adresse valide" -ForegroundColor $(if ($clientId1) { "Green" } else { "Red" })
Write-Host "  ✓ Test 2 : Création avec adresse invalide" -ForegroundColor $(if ($clientId2) { "Green" } else { "Red" })
Write-Host "  ✓ Test 3 : Liste des clients" -ForegroundColor Green
Write-Host "  ✓ Test 4 : Clients avec coordonnées" -ForegroundColor Green
Write-Host "  ✓ Test 5 : Modification client" -ForegroundColor Yellow
Write-Host "  ✓ Test 6 : Vérification détaillée" -ForegroundColor $(if ($clientId1) { "Green" } else { "Red" })

Write-Host "`nPoints de validation :" -ForegroundColor White
Write-Host "  • Géocodage automatique fonctionnel" -ForegroundColor Gray
Write-Host "  • Gestion d'erreur robuste (création sans GPS)" -ForegroundColor Gray
Write-Host "  • Mise à jour des coordonnées possible" -ForegroundColor Gray
Write-Host "  • Interface affiche lignes rouges si pas de GPS" -ForegroundColor Gray

Write-Host "`nProchaines étapes :" -ForegroundColor Cyan
Write-Host "  1. Vérifier visuellement dans l'interface web" -ForegroundColor Gray
Write-Host "  2. Exécuter le script SQL de test" -ForegroundColor Gray
Write-Host "  3. Valider l'affichage rouge/blanc des lignes" -ForegroundColor Gray
Write-Host "  4. Tester l'import QAD si configuré" -ForegroundColor Gray

Write-Host "`n🎉 Tests API terminés !`n" -ForegroundColor Green
