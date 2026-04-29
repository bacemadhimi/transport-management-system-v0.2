-- ============================================================================
-- Script: Setup-GeographicalEntities-Tunisia.sql
-- Description: Ajoute toutes les villes/gouvernorats de Tunisie avec coordonnées GPS
--              pour permettre l'auto-assignation automatique des clients
-- Usage: Exécuter UNE SEULE FOIS dans SQL Server Management Studio ou via CLI
-- ============================================================================

-- 1. Vérifier l'état actuel
PRINT '=== État actuel des entités géographiques ===';
SELECT 
    Id, 
    Name, 
    Code, 
    Latitude, 
    Longitude, 
    IsActive,
    CASE 
        WHEN Latitude IS NULL OR Longitude IS NULL THEN '❌ PAS DE COORDONNÉES GPS'
        ELSE '✅ Coordonnées OK'
    END AS GPStatus
FROM GeographicalEntities
ORDER BY Name;

-- 2. Ajouter les gouvernorats/villes principales de Tunisie (si non existants)
PRINT '';
PRINT '=== Ajout des entités géographiques manquantes ===';

-- Tunis
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Tunis')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Tunis', 'TUN', 36.8065, 10.1815, 1, GETDATE());
    PRINT '✅ Tunis ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.8065, Longitude = 10.1815, IsActive = 1
    WHERE Name = 'Tunis' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Tunis existe déjà';
END

-- Sfax
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Sfax')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Sfax', 'SFX', 34.7406, 10.7603, 1, GETDATE());
    PRINT '✅ Sfax ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 34.7406, Longitude = 10.7603, IsActive = 1
    WHERE Name = 'Sfax' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Sfax existe déjà';
END

-- Sousse
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Sousse')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Sousse', 'SOU', 35.8256, 10.6369, 1, GETDATE());
    PRINT '✅ Sousse ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 35.8256, Longitude = 10.6369, IsActive = 1
    WHERE Name = 'Sousse' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Sousse existe déjà';
END

-- Kairouan
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Kairouan')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Kairouan', 'KAI', 35.6781, 10.0963, 1, GETDATE());
    PRINT '✅ Kairouan ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 35.6781, Longitude = 10.0963, IsActive = 1
    WHERE Name = 'Kairouan' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Kairouan existe déjà';
END

-- Bizerte
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Bizerte')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Bizerte', 'BIZ', 37.2744, 9.8739, 1, GETDATE());
    PRINT '✅ Bizerte ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 37.2744, Longitude = 9.8739, IsActive = 1
    WHERE Name = 'Bizerte' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Bizerte existe déjà';
END

-- Gabès
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Gabès')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Gabès', 'GAB', 33.8815, 10.0982, 1, GETDATE());
    PRINT '✅ Gabès ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 33.8815, Longitude = 10.0982, IsActive = 1
    WHERE Name = 'Gabès' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Gabès existe déjà';
END

-- Ariana
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Ariana')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Ariana', 'ARI', 36.8625, 10.1956, 1, GETDATE());
    PRINT '✅ Ariana ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.8625, Longitude = 10.1956, IsActive = 1
    WHERE Name = 'Ariana' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Ariana existe déjà';
END

-- Gafsa
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Gafsa')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Gafsa', 'GAF', 34.4250, 8.7842, 1, GETDATE());
    PRINT '✅ Gafsa ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 34.4250, Longitude = 8.7842, IsActive = 1
    WHERE Name = 'Gafsa' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Gafsa existe déjà';
END

-- Monastir (CELLE QUI VOUS INTÉRESSE !)
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Monastir')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Monastir', 'MON', 35.7643, 10.8113, 1, GETDATE());
    PRINT '✅ Monastir ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 35.7643, Longitude = 10.8113, IsActive = 1
    WHERE Name = 'Monastir' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Monastir existe déjà - coordonnées mises à jour';
END

-- Ben Arous
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Ben Arous')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Ben Arous', 'BAR', 36.7547, 10.2181, 1, GETDATE());
    PRINT '✅ Ben Arous ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.7547, Longitude = 10.2181, IsActive = 1
    WHERE Name = 'Ben Arous' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Ben Arous existe déjà';
END

-- Kasserine
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Kasserine')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Kasserine', 'KAS', 35.1678, 8.8369, 1, GETDATE());
    PRINT '✅ Kasserine ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 35.1678, Longitude = 8.8369, IsActive = 1
    WHERE Name = 'Kasserine' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Kasserine existe déjà';
END

-- Médenine
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Médenine')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Médenine', 'MED', 33.3547, 10.5053, 1, GETDATE());
    PRINT '✅ Médenine ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 33.3547, Longitude = 10.5053, IsActive = 1
    WHERE Name = 'Médenine' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Médenine existe déjà';
END

-- Nabeul
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Nabeul')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Nabeul', 'NAB', 36.4561, 10.7378, 1, GETDATE());
    PRINT '✅ Nabeul ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.4561, Longitude = 10.7378, IsActive = 1
    WHERE Name = 'Nabeul' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Nabeul existe déjà';
END

-- Tataouine
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Tataouine')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Tataouine', 'TAT', 32.9297, 10.4517, 1, GETDATE());
    PRINT '✅ Tataouine ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 32.9297, Longitude = 10.4517, IsActive = 1
    WHERE Name = 'Tataouine' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Tataouine existe déjà';
END

-- Béja
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Béja')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Béja', 'BEJ', 36.7256, 9.1817, 1, GETDATE());
    PRINT '✅ Béja ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.7256, Longitude = 9.1817, IsActive = 1
    WHERE Name = 'Béja' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Béja existe déjà';
END

-- Jendouba
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Jendouba')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Jendouba', 'JEN', 36.5011, 8.7803, 1, GETDATE());
    PRINT '✅ Jendouba ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.5011, Longitude = 8.7803, IsActive = 1
    WHERE Name = 'Jendouba' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Jendouba existe déjà';
END

-- Siliana
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Siliana')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Siliana', 'SIL', 36.0847, 9.3706, 1, GETDATE());
    PRINT '✅ Siliana ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.0847, Longitude = 9.3706, IsActive = 1
    WHERE Name = 'Siliana' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Siliana existe déjà';
END

-- Le Kef
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Le Kef')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Le Kef', 'KEF', 36.1742, 8.7050, 1, GETDATE());
    PRINT '✅ Le Kef ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.1742, Longitude = 8.7050, IsActive = 1
    WHERE Name = 'Le Kef' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Le Kef existe déjà';
END

-- Mahdia
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Mahdia')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Mahdia', 'MAH', 35.5047, 11.0622, 1, GETDATE());
    PRINT '✅ Mahdia ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 35.5047, Longitude = 11.0622, IsActive = 1
    WHERE Name = 'Mahdia' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Mahdia existe déjà';
END

-- Tozeur
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Tozeur')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Tozeur', 'TOZ', 33.9197, 8.1339, 1, GETDATE());
    PRINT '✅ Tozeur ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 33.9197, Longitude = 8.1339, IsActive = 1
    WHERE Name = 'Tozeur' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Tozeur existe déjà';
END

-- Kébili
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Kébili')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Kébili', 'KEB', 33.7044, 8.9692, 1, GETDATE());
    PRINT '✅ Kébili ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 33.7044, Longitude = 8.9692, IsActive = 1
    WHERE Name = 'Kébili' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Kébili existe déjà';
END

-- Zaghouan
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Zaghouan')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Zaghouan', 'ZAG', 36.4028, 10.1428, 1, GETDATE());
    PRINT '✅ Zaghouan ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.4028, Longitude = 10.1428, IsActive = 1
    WHERE Name = 'Zaghouan' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Zaghouan existe déjà';
END

-- Manouba
IF NOT EXISTS (SELECT 1 FROM GeographicalEntities WHERE Name = 'Manouba')
BEGIN
    INSERT INTO GeographicalEntities (Name, Code, Latitude, Longitude, IsActive, CreatedAt)
    VALUES ('Manouba', 'MAN', 36.8089, 10.0972, 1, GETDATE());
    PRINT '✅ Manouba ajouté';
END
ELSE
BEGIN
    UPDATE GeographicalEntities 
    SET Latitude = 36.8089, Longitude = 10.0972, IsActive = 1
    WHERE Name = 'Manouba' AND (Latitude IS NULL OR Longitude IS NULL);
    PRINT 'ℹ️ Manouba existe déjà';
END

-- 3. Résultat final
PRINT '';
PRINT '=== Résultat final ===';
SELECT 
    COUNT(*) AS TotalEntities,
    SUM(CASE WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN 1 ELSE 0 END) AS WithGPSCoords,
    SUM(CASE WHEN Latitude IS NULL OR Longitude IS NULL THEN 1 ELSE 0 END) AS WithoutGPSCoords
FROM GeographicalEntities
WHERE IsActive = 1;

PRINT '';
PRINT '=== Liste complète des entités actives ===';
SELECT 
    Id, 
    Name, 
    Code, 
    Latitude, 
    Longitude,
    CASE 
        WHEN Latitude IS NOT NULL AND Longitude IS NOT NULL THEN '✅ GPS OK'
        ELSE '❌ MISSING GPS'
    END AS Status
FROM GeographicalEntities
WHERE IsActive = 1
ORDER BY Name;

PRINT '';
PRINT '✅ Script terminé avec succès !';
PRINT '💡 Maintenant, redémarrez le backend et testez la création/modification de clients.';
PRINT '💡 Les clients seront automatiquement assignés à la ville la plus proche.';
