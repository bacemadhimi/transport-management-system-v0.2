-- =====================================================
-- SCRIPT DE TEST - Gestion GPS des Clients
-- =====================================================
-- Objectif : Valider que les coordonnées GPS sont 
-- correctement détectées, stockées et affichées
-- =====================================================

USE [TransportManagementSystem]; -- Adapter le nom de votre BDD
GO

-- =====================================================
-- 1. NETTOYAGE - Supprimer les données de test précédentes
-- =====================================================
PRINT '🧹 Nettoyage des données de test précédentes...';

DELETE FROM CustomerGeographicalEntities 
WHERE CustomerId IN (
    SELECT Id FROM Customers 
    WHERE Matricule LIKE 'CLI-TEST-%' 
       OR Matricule LIKE 'API-TEST-%'
);

DELETE FROM Orders 
WHERE CustomerId IN (
    SELECT Id FROM Customers 
    WHERE Matricule LIKE 'CLI-TEST-%' 
       OR Matricule LIKE 'API-TEST-%'
);

DELETE FROM Customers 
WHERE Matricule LIKE 'CLI-TEST-%' 
   OR Matricule LIKE 'API-TEST-%';

PRINT '✅ Nettoyage terminé.';
GO

-- =====================================================
-- 2. VÉRIFICATION STRUCTURE TABLE
-- =====================================================
PRINT '🔍 Vérification de la structure de la table Customers...';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Customers'
  AND COLUMN_NAME IN ('Latitude', 'Longitude', 'Address', 'Name', 'Matricule', 'SourceSystem')
ORDER BY ORDINAL_POSITION;

PRINT '✅ Structure vérifiée.';
GO

-- =====================================================
-- 3. ÉTAT INITIAL - Statistiques avant tests
-- =====================================================
PRINT '📊 État initial de la base de données...';

SELECT 
    SourceSystem,
    COUNT(*) AS TotalCustomers,
    SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) AS WithGPS,
    SUM(CASE WHEN Latitude IS NULL OR Longitude IS NULL THEN 1 ELSE 0 END) AS WithoutGPS,
    ROUND(
        100.0 * SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) / 
        NULLIF(COUNT(*), 0), 
        2
    ) AS CoveragePercentage
FROM Customers
GROUP BY SourceSystem
ORDER BY SourceSystem;

PRINT '✅ État initial enregistré.';
GO

-- =====================================================
-- 4. INSERTION MANUELLE - Simulation création via API
-- =====================================================
PRINT '📝 Insertion de clients de test...';

-- Client 1 : Avec adresse valide (Tunis) - DOIT avoir GPS après géocodage
INSERT INTO Customers (
    Name, 
    Matricule, 
    Address, 
    Phone, 
    Email, 
    Contact,
    SourceSystem,
    Latitude,
    Longitude,
    CreatedAt
)
VALUES (
    'Client Test Tunis Centre',
    'CLI-TEST-TUN-001',
    'Avenue Habib Bourguiba, Tunis 1000, Tunisie',
    '+216 71 123 456',
    'test.tunis@example.com',
    'Mohamed Ben Ali',
    0, -- DataSource.TMS = 0
    36.8065, -- Simulé (normalement auto-détecté par backend)
    10.1815,
    GETUTCDATE()
);

PRINT '✅ Client 1 créé (Tunis avec GPS).';

-- Client 2 : Sans adresse ou adresse invalide - SANS GPS
INSERT INTO Customers (
    Name, 
    Matricule, 
    Address, 
    Phone, 
    Email, 
    Contact,
    SourceSystem,
    Latitude,
    Longitude,
    CreatedAt
)
VALUES (
    'Client Sans Coordonnées',
    'CLI-TEST-NOGPS-002',
    'Rue Imaginaire 999, Ville Inexistante',
    '+216 71 999 999',
    'nogps@example.com',
    'Test User',
    0, -- TMS
    NULL,
    NULL,
    GETUTCDATE()
);

PRINT '✅ Client 2 créé (Sans GPS).';

-- Client 3 : Adresse Sfax - AVEC GPS
INSERT INTO Customers (
    Name, 
    Matricule, 
    Address, 
    Phone, 
    Email, 
    Contact,
    SourceSystem,
    Latitude,
    Longitude,
    CreatedAt
)
VALUES (
    'Client Test Sfax',
    'CLI-TEST-SFAX-003',
    'Avenue de la Liberté, Sfax 3000, Tunisie',
    '+216 74 456 789',
    'test.sfax@example.com',
    'Ahmed Trabelsi',
    0, -- TMS
    34.7406,
    10.7603,
    GETUTCDATE()
);

PRINT '✅ Client 3 créé (Sfax avec GPS).';

-- Client 4 : Import QAD simulé - AVEC GPS
INSERT INTO Customers (
    Name, 
    Matricule, 
    Address, 
    Phone, 
    Email, 
    Contact,
    SourceSystem,
    ExternalId,
    Latitude,
    Longitude,
    CreatedAt
)
VALUES (
    'Client QAD Sousse',
    'CLI-TEST-QAD-004',
    'Avenue Léopold Sédar Senghor, Sousse 4000, Tunisie',
    '+216 73 321 654',
    'qad.sousse@example.com',
    'QAD Contact',
    1, -- DataSource.QAD = 1
    'QAD-CUST-12345',
    35.8256,
    10.6369,
    GETUTCDATE()
);

PRINT '✅ Client 4 créé (QAD avec GPS).';

-- Client 5 : Import QAD sans GPS
INSERT INTO Customers (
    Name, 
    Matricule, 
    Address, 
    Phone, 
    Email, 
    Contact,
    SourceSystem,
    ExternalId,
    Latitude,
    Longitude,
    CreatedAt
)
VALUES (
    'Client QAD Sans GPS',
    'CLI-TEST-QAD-005',
    NULL, -- Pas d'adresse
    '+216 73 999 888',
    'qad.nogps@example.com',
    'QAD No Address',
    1, -- QAD
    'QAD-CUST-67890',
    NULL,
    NULL,
    GETUTCDATE()
);

PRINT '✅ Client 5 créé (QAD sans GPS).';

PRINT '🎉 Tous les clients de test ont été insérés.';
GO

-- =====================================================
-- 5. VÉRIFICATION - Clients créés avec statut GPS
-- =====================================================
PRINT '🔍 Vérification des clients créés...';

SELECT 
    Id,
    Name,
    Matricule,
    Address,
    Latitude,
    Longitude,
    SourceSystem,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL 
        THEN '✅ HAS GPS' 
        ELSE '❌ MISSING GPS' 
    END AS GpsStatus,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL 
             AND Latitude BETWEEN -90 AND 90 
             AND Longitude BETWEEN -180 AND 180
        THEN '✅ VALID'
        WHEN Latitude IS NULL OR Longitude IS NULL
        THEN '⚠️ MISSING'
        ELSE '❌ INVALID'
    END AS ValidationStatus,
    CreatedAt
FROM Customers
WHERE Matricule LIKE 'CLI-TEST-%'
ORDER BY CreatedAt DESC;

PRINT '✅ Vérification terminée.';
GO

-- =====================================================
-- 6. TEST LOGIQUE FRONTEND - Simulation shouldHighlightMissingGps
-- =====================================================
PRINT '🎨 Simulation de la logique frontend (lignes rouges)...';

SELECT 
    Name,
    Matricule,
    Latitude,
    Longitude,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL 
             AND Latitude != '' AND Longitude != ''
             AND TRY_CAST(Latitude AS FLOAT) IS NOT NULL
             AND TRY_CAST(Longitude AS FLOAT) IS NOT NULL
        THEN '⚪ NORMAL (White background)'
        ELSE '🔴 HIGHLIGHT (Red background + ⚠️ icon)'
    END AS FrontendDisplay,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 0
        ELSE 1
    END AS ShouldHighlightRow -- Correspond à shouldHighlightMissingGps()
FROM Customers
WHERE Matricule LIKE 'CLI-TEST-%'
ORDER BY ShouldHighlightRow DESC, Name;

PRINT '✅ Simulation frontend terminée.';
GO

-- =====================================================
-- 7. STATISTIQUES APRÈS TESTS
-- =====================================================
PRINT '📊 Statistiques après insertion des données de test...';

SELECT 
    SourceSystem,
    COUNT(*) AS TotalCustomers,
    SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) AS WithGPS,
    SUM(CASE WHEN Latitude IS NULL OR Longitude IS NULL THEN 1 ELSE 0 END) AS WithoutGPS,
    ROUND(
        100.0 * SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) / 
        NULLIF(COUNT(*), 0), 
        2
    ) AS CoveragePercentage
FROM Customers
WHERE Matricule LIKE 'CLI-TEST-%'
GROUP BY SourceSystem
ORDER BY SourceSystem;

PRINT '✅ Statistiques calculées.';
GO

-- =====================================================
-- 8. TEST FILTRE PAR SOURCE
-- =====================================================
PRINT '🔎 Test du filtre par source système...';

PRINT '-- Clients TMS uniquement:';
SELECT Name, Matricule, SourceSystem, Latitude, Longitude
FROM Customers
WHERE Matricule LIKE 'CLI-TEST-%'
  AND SourceSystem = 0; -- TMS

PRINT '-- Clients QAD uniquement:';
SELECT Name, Matricule, SourceSystem, Latitude, Longitude
FROM Customers
WHERE Matricule LIKE 'CLI-TEST-%'
  AND SourceSystem = 1; -- QAD

PRINT '✅ Filtres testés.';
GO

-- =====================================================
-- 9. TEST MISE À JOUR - Simulation modification client
-- =====================================================
PRINT '🔄 Test de mise à jour (ajout GPS à client sans coordonnées)...';

-- Avant mise à jour
PRINT '-- Avant mise à jour:';
SELECT Name, Address, Latitude, Longitude
FROM Customers
WHERE Matricule = 'CLI-TEST-NOGPS-002';

-- Mise à jour (simulation géocodage réussi)
UPDATE Customers
SET 
    Latitude = 36.8000, -- Coordonnées approximatives
    Longitude = 10.1800,
    UpdatedAt = GETUTCDATE()
WHERE Matricule = 'CLI-TEST-NOGPS-002';

-- Après mise à jour
PRINT '-- Après mise à jour:';
SELECT Name, Address, Latitude, Longitude, UpdatedAt
FROM Customers
WHERE Matricule = 'CLI-TEST-NOGPS-002';

PRINT '✅ Mise à jour testée.';
GO

-- =====================================================
-- 10. VALIDATION FINALE - Résumé complet
-- =====================================================
PRINT '📋 RAPPORT FINAL DE TEST...';
PRINT '==========================================';

DECLARE @TotalTest INT, @WithGps INT, @WithoutGps INT, @Coverage DECIMAL(5,2);

SELECT 
    @TotalTest = COUNT(*),
    @WithGps = SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END),
    @WithoutGps = SUM(CASE WHEN Latitude IS NULL OR Longitude IS NULL THEN 1 ELSE 0 END),
    @Coverage = ROUND(
        100.0 * SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) / 
        NULLIF(COUNT(*), 0), 
        2
    )
FROM Customers
WHERE Matricule LIKE 'CLI-TEST-%';

PRINT 'Total clients de test : ' + CAST(@TotalTest AS VARCHAR);
PRINT 'Avec coordonnées GPS  : ' + CAST(@WithGps AS VARCHAR);
PRINT 'Sans coordonnées GPS  : ' + CAST(@WithoutGps AS VARCHAR);
PRINT 'Taux de couverture    : ' + CAST(@Coverage AS VARCHAR) + '%';
PRINT '==========================================';

IF @Coverage >= 80
    PRINT '✅ RÉSULTAT : EXCELLENT (>= 80% de couverture GPS)';
ELSE IF @Coverage >= 60
    PRINT '⚠️ RÉSULTAT : MOYEN (60-80% de couverture GPS)';
ELSE
    PRINT '❌ RÉSULTAT : INSUFFISANT (< 60% de couverture GPS)';

PRINT '';
PRINT 'Détails par client :';
SELECT 
    ROW_NUMBER() OVER (ORDER BY Id) AS '#',
    Name,
    Matricule,
    CASE WHEN SourceSystem = 0 THEN 'TMS' ELSE 'QAD' END AS Source,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN '✅'
        ELSE '❌'
    END AS GPS,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN '⚪ Normal'
        ELSE '🔴 Rouge'
    END AS Display
FROM Customers
WHERE Matricule LIKE 'CLI-TEST-%'
ORDER BY Id;

PRINT '';
PRINT '🎉 TEST TERMINÉ !';
GO

-- =====================================================
-- 11. NETTOYAGE FINAL (Optionnel - décommenter si besoin)
-- =====================================================
/*
PRINT '🧹 Nettoyage final des données de test...';

DELETE FROM CustomerGeographicalEntities 
WHERE CustomerId IN (
    SELECT Id FROM Customers 
    WHERE Matricule LIKE 'CLI-TEST-%' 
       OR Matricule LIKE 'API-TEST-%'
);

DELETE FROM Orders 
WHERE CustomerId IN (
    SELECT Id FROM Customers 
    WHERE Matricule LIKE 'CLI-TEST-%' 
       OR Matricule LIKE 'API-TEST-%'
);

DELETE FROM Customers 
WHERE Matricule LIKE 'CLI-TEST-%' 
   OR Matricule LIKE 'API-TEST-%';

PRINT '✅ Données de test supprimées.';
*/
