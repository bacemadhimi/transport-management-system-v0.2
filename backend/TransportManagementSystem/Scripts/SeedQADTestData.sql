-- ============================================================================
-- Script de données de test pour QAD
-- Date: 2026-04-23
-- Description: Insère des clients et commandes de test dans QAD
-- ============================================================================

USE [QAD];
GO

PRINT '═══════════════════════════════════════════════════════';
PRINT '📦 Insertion des données de test QAD';
PRINT '═══════════════════════════════════════════════════════';
GO

-- ============================================================================
-- Étape 1: Insertion des clients (cm_mstr)
-- ============================================================================
PRINT '👥 Insertion des clients...';

INSERT INTO [dbo].[cm_mstr] 
    ([cm_domain], [BusinessRelationName1], [AddressStreet1], [AddressCity], [CountryCode], [ZoneId])
VALUES 
    ('TEST', 'Client Test 1', 'Rue de Tunis 1', 'Tunis', 'TN', 1),
    ('TEST', 'Client Test 2', 'Avenue Habib Bourguiba', 'Sfax', 'TN', 2),
    ('TEST', 'Client Test 3', 'Route de Sousse', 'Kairouan', 'TN', 3),
    ('TEST', 'Client Test 4', 'Rue de la République', 'Bizerte', 'TN', 4),
    ('TEST', 'Client Test 5', 'Avenue Farhat Hached', 'Nabeul', 'TN', 5);

DECLARE @ClientCount INT = @@ROWCOUNT;
PRINT CONCAT('✅ ', @ClientCount, ' clients ajoutés');
GO

-- ============================================================================
-- Étape 2: Récupération des IDs des clients insérés
-- ============================================================================
DECLARE @ClientId1 INT = (SELECT TOP 1 cm_id FROM cm_mstr WHERE BusinessRelationName1 = 'Client Test 1' ORDER BY cm_id DESC);
DECLARE @ClientId2 INT = (SELECT TOP 1 cm_id FROM cm_mstr WHERE BusinessRelationName1 = 'Client Test 2' ORDER BY cm_id DESC);
DECLARE @ClientId3 INT = (SELECT TOP 1 cm_id FROM cm_mstr WHERE BusinessRelationName1 = 'Client Test 3' ORDER BY cm_id DESC);
DECLARE @ClientId4 INT = (SELECT TOP 1 cm_id FROM cm_mstr WHERE BusinessRelationName1 = 'Client Test 4' ORDER BY cm_id DESC);
DECLARE @ClientId5 INT = (SELECT TOP 1 cm_id FROM cm_mstr WHERE BusinessRelationName1 = 'Client Test 5' ORDER BY cm_id DESC);

PRINT CONCAT('📋 Client IDs récupérés: ', @ClientId1, ', ', @ClientId2, ', ', @ClientId3, ', ', @ClientId4, ', ', @ClientId5);
GO

-- ============================================================================
-- Étape 3: Insertion des commandes (so_mstr) - AVEC so_cust OBLIGATOIRE
-- ============================================================================
PRINT '📝 Insertion des commandes...';

INSERT INTO [dbo].[so_mstr] 
    ([so_nbr], [so_site], [so_domain], [so_cust], [so_ord_date], [so_due_date], [so_stat], [so_priority], [so_total_amt], [so_created_date], [so_updated_date])
VALUES 
    ('SO001', 'SITE1', 'TEST', @ClientId1, GETDATE(), DATEADD(DAY, 7, GETDATE()), 'OP', 1, 1500.00, GETDATE(), GETDATE()),
    ('SO002', 'SITE1', 'TEST', @ClientId2, GETDATE(), DATEADD(DAY, 5, GETDATE()), 'OP', 2, 2300.50, GETDATE(), GETDATE()),
    ('SO003', 'SITE1', 'TEST', @ClientId3, GETDATE(), DATEADD(DAY, 10, GETDATE()), 'OP', 1, 890.75, GETDATE(), GETDATE()),
    ('SO004', 'SITE1', 'TEST', @ClientId4, GETDATE(), DATEADD(DAY, 3, GETDATE()), 'OP', 3, 3200.00, GETDATE(), GETDATE()),
    ('SO005', 'SITE1', 'TEST', @ClientId5, GETDATE(), DATEADD(DAY, 14, GETDATE()), 'OP', 2, 1750.25, GETDATE(), GETDATE()),
    ('SO006', 'SITE1', 'TEST', @ClientId1, GETDATE(), DATEADD(DAY, 6, GETDATE()), 'OP', 1, 2100.00, GETDATE(), GETDATE()),
    ('SO007', 'SITE1', 'TEST', @ClientId2, GETDATE(), DATEADD(DAY, 8, GETDATE()), 'OP', 2, 1450.80, GETDATE(), GETDATE()),
    ('SO008', 'SITE1', 'TEST', @ClientId3, GETDATE(), DATEADD(DAY, 4, GETDATE()), 'OP', 1, 980.50, GETDATE(), GETDATE());

DECLARE @OrderCount INT = @@ROWCOUNT;
PRINT CONCAT('✅ ', @OrderCount, ' commandes ajoutées');
GO

-- ============================================================================
-- Étape 4: Récupération des IDs des commandes insérées
-- ============================================================================
DECLARE @SoId1 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO001');
DECLARE @SoId2 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO002');
DECLARE @SoId3 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO003');
DECLARE @SoId4 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO004');
DECLARE @SoId5 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO005');
DECLARE @SoId6 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO006');
DECLARE @SoId7 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO007');
DECLARE @SoId8 INT = (SELECT so_id FROM so_mstr WHERE so_nbr = 'SO008');

PRINT CONCAT('📋 Order IDs récupérés: ', @SoId1, ', ', @SoId2, ', ', @SoId3, ', ', @SoId4, ', ', @SoId5, ', ', @SoId6, ', ', @SoId7, ', ', @SoId8);
GO

-- ============================================================================
-- Étape 5: Insertion des détails de commandes (sod_det) - AVEC sod_so_id OBLIGATOIRE
-- ============================================================================
PRINT '📋 Insertion des détails de commandes...';

INSERT INTO [dbo].[sod_det] 
    ([sod_so_id], [sod_line], [sod_part], [sod_um], [sod_qty_ord], [sod_qty_rcvd], [sod_um_conv], [sod_due_date], [sod_status])
VALUES 
    (@SoId1, 1, 'PART001', 'PCS', 100.00, 0.00, 1.00, DATEADD(DAY, 7, GETDATE()), 'OPEN'),
    (@SoId2, 1, 'PART002', 'PCS', 200.00, 50.00, 1.00, DATEADD(DAY, 5, GETDATE()), 'OPEN'),
    (@SoId3, 1, 'PART003', 'BOX', 50.00, 0.00, 1.00, DATEADD(DAY, 10, GETDATE()), 'OPEN'),
    (@SoId4, 1, 'PART004', 'PAL', 30.00, 10.00, 1.00, DATEADD(DAY, 3, GETDATE()), 'OPEN'),
    (@SoId5, 1, 'PART005', 'PCS', 150.00, 0.00, 1.00, DATEADD(DAY, 14, GETDATE()), 'OPEN'),
    (@SoId6, 1, 'PART006', 'BOX', 80.00, 20.00, 1.00, DATEADD(DAY, 6, GETDATE()), 'OPEN'),
    (@SoId7, 1, 'PART007', 'PCS', 120.00, 0.00, 1.00, DATEADD(DAY, 8, GETDATE()), 'OPEN'),
    (@SoId8, 1, 'PART008', 'PAL', 25.00, 5.00, 1.00, DATEADD(DAY, 4, GETDATE()), 'OPEN');

DECLARE @DetailCount INT = @@ROWCOUNT;
PRINT CONCAT('✅ ', @DetailCount, ' détails de commandes ajoutés');
GO

-- ============================================================================
-- Étape 6: Récapitulatif
-- ============================================================================
PRINT '';
PRINT '---------------------------------------------------';
PRINT '📊 RÉCAPITULATIF DES DONNÉES QAD';
PRINT '---------------------------------------------------';

SELECT 'Clients' AS Type, COUNT(*) AS Nombre FROM cm_mstr WHERE cm_domain = 'TEST'
UNION ALL
SELECT 'Commandes', COUNT(*) FROM so_mstr WHERE so_domain = 'TEST'
UNION ALL
SELECT 'Détails', COUNT(*) FROM sod_det sd INNER JOIN so_mstr sm ON sd.sod_so_id = sm.so_id WHERE sm.so_domain = 'TEST';

PRINT '';
PRINT '? Données prêtes pour synchronisation!';
PRINT '---------------------------------------------------';
PRINT '';
PRINT 'Heure de fin : ' + CONVERT(VARCHAR, GETDATE(), 126);
PRINT '═══════════════════════════════════════════════════════';
GO
