-- ============================================================================
-- Script de création de la base de données QAD
-- Date: 2026-04-23
-- Description: Base de données pour l'intégration ERP QAD avec TMS
-- ============================================================================

USE master;
GO

-- ============================================================================
-- Étape 1: Suppression de la base existante (si présente)
-- ============================================================================
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'QAD')
BEGIN
    PRINT '⚠️ Suppression de la base QAD existante...';
    ALTER DATABASE QAD SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE QAD;
    PRINT '✅ Base QAD supprimée avec succès';
END
GO

-- ============================================================================
-- Étape 2: Création de la base de données QAD
-- ============================================================================
PRINT '📦 Création de la base de données QAD...';

-- IMPORTANT: Modifiez le chemin ci-dessous selon votre installation SQL Server
-- Pour trouver votre chemin, exécutez: SELECT SERVERPROPERTY('InstanceDefaultDataPath')
CREATE DATABASE [QAD]
ON PRIMARY 
( 
    NAME = N'QAD_Data', 
    FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\QAD.mdf',
    SIZE = 10MB, 
    MAXSIZE = UNLIMITED, 
    FILEGROWTH = 10MB 
)
LOG ON 
( 
    NAME = N'QAD_Log', 
    FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\QAD_log.ldf',
    SIZE = 5MB, 
    MAXSIZE = 2GB, 
    FILEGROWTH = 5MB 
);
GO

PRINT '✅ Base QAD créée avec succès';
GO

-- ============================================================================
-- Étape 3: Configuration de la base de données
-- ============================================================================
USE [QAD];
GO

-- Niveau de compatibilité (SQL Server 2019 = 150)
ALTER DATABASE [QAD] SET COMPATIBILITY_LEVEL = 150;
GO

-- Configuration Full-Text Search (si installé)
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
BEGIN
    EXEC sp_fulltext_database @action = 'enable';
    PRINT '✅ Full-Text Search activé';
END
GO

-- Paramètres ANSI recommandés
ALTER DATABASE [QAD] SET ANSI_NULLS ON;
ALTER DATABASE [QAD] SET QUOTED_IDENTIFIER ON;
ALTER DATABASE [QAD] SET CONCAT_NULL_YIELDS_NULL ON;
ALTER DATABASE [QAD] SET ANSI_PADDING ON;
ALTER DATABASE [QAD] SET ANSI_WARNINGS ON;
ALTER DATABASE [QAD] SET ARITHABORT ON;
GO

-- Autres paramètres de performance
ALTER DATABASE [QAD] SET AUTO_CLOSE OFF;
ALTER DATABASE [QAD] SET AUTO_SHRINK OFF;
ALTER DATABASE [QAD] SET AUTO_UPDATE_STATISTICS ON;
ALTER DATABASE [QAD] SET CURSOR_DEFAULT LOCAL;
ALTER DATABASE [QAD] SET NUMERIC_ROUNDABORT OFF;
ALTER DATABASE [QAD] SET RECURSIVE_TRIGGERS OFF;
ALTER DATABASE [QAD] SET ALLOW_SNAPSHOT_ISOLATION OFF;
ALTER DATABASE [QAD] SET READ_COMMITTED_SNAPSHOT OFF;
ALTER DATABASE [QAD] SET PARAMETERIZATION SIMPLE;
ALTER DATABASE [QAD] SET RECOVERY SIMPLE;
ALTER DATABASE [QAD] SET MULTI_USER;
ALTER DATABASE [QAD] SET PAGE_VERIFY CHECKSUM;
ALTER DATABASE [QAD] SET DB_CHAINING OFF;
GO

PRINT '✅ Configuration de la base terminée';
GO

-- ============================================================================
-- Étape 4: Création des tables
-- ============================================================================
PRINT '📊 Création des tables...';

-- ----------------------------------------------------------------------------
-- Table: bom_mstr (Bill of Materials Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[bom_mstr](
    [bom_domain] VARCHAR(8) NULL,
    [bom_parent] VARCHAR(18) NULL,
    [bom_desc] VARCHAR(50) NULL,
    [bom_batch] DECIMAL(18, 2) NULL,
    [bom_batch_um] VARCHAR(2) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: cm_mstr (Customer Master) - CLIENTS QAD
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[cm_mstr](
    [cm_id] INT IDENTITY(1,1) NOT NULL,
    [cm_domain] VARCHAR(200) NULL,
    [cm_addr] VARCHAR(50) NULL,
    [AddressName] VARCHAR(100) NULL,
    [BusinessRelationName1] VARCHAR(36) NULL,
    [BusinessRelationName2] VARCHAR(36) NULL,
    [AddressStreet1] VARCHAR(36) NULL,
    [AddressStreet2] VARCHAR(36) NULL,
    [AddressStreet3] VARCHAR(36) NULL,
    [AddressCity] VARCHAR(20) NULL,
    [CountryCode] VARCHAR(20) NULL,
    [CountryDescription] VARCHAR(28) NULL,
    [AddressZip] VARCHAR(200) NULL,
    [CurrencyCode] VARCHAR(100) NULL,
    [ZoneId] INT NULL,
    CONSTRAINT [PK_cm_mstr] PRIMARY KEY CLUSTERED ([cm_id] ASC)
        WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, 
              ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: code_mstr (Code Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[code_mstr](
    [code_domain] VARCHAR(8) NULL,
    [code_fldname] VARCHAR(20) NULL,
    [code_value] VARCHAR(8) NULL,
    [code_cmmt] VARCHAR(40) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: is_mstr (Item Status Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[is_mstr](
    [is_domain] VARCHAR(8) NULL,
    [is_status] VARCHAR(10) NULL,
    [is_avail] BIT NULL,
    [is_nettable] BIT NULL,
    [is_overissue] BIT NULL,
    [is_mod_date] DATE NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: ld_det (Location Detail)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[ld_det](
    [ld_domain] VARCHAR(8) NOT NULL,
    [ld_part] VARCHAR(18) NOT NULL,
    [ld_site] VARCHAR(8) NOT NULL,
    [ld_loc] VARCHAR(8) NOT NULL,
    [ld_lot] VARCHAR(18) NULL,
    [ld_ref] VARCHAR(8) NULL,
    [ld_status] VARCHAR(8) NOT NULL,
    [ld_qty_oh] VARCHAR(18) NOT NULL,
    [ld_expire] VARCHAR(18) NULL,
    [ld_date] VARCHAR(18) NOT NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: loc_mstr (Location Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[loc_mstr](
    [loc_domain] VARCHAR(8) NULL,
    [loc_site] VARCHAR(8) NULL,
    [loc_loc] VARCHAR(8) NULL,
    [loc_desc] VARCHAR(24) NULL,
    [loc_status] VARCHAR(8) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: pl_mstr (Product Line Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[pl_mstr](
    [pl_domain] VARCHAR(8) NULL,
    [pl_prod_line] VARCHAR(4) NULL,
    [pl_desc] VARCHAR(50) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: po_mstr (Purchase Order Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[po_mstr](
    [po_domain] VARCHAR(8) NOT NULL,
    [po_nbr] VARCHAR(8) NOT NULL,
    [po_due_date] DATE NULL,
    [po_ord_date] DATE NULL,
    [po_cls_date] DATE NULL,
    [po_vend] VARCHAR(8) NULL,
    [po_stat] CHAR(2) NULL,
    [po_site] VARCHAR(8) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: pod_det (Purchase Order Detail)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[pod_det](
    [pod_domain] VARCHAR(8) NOT NULL,
    [pod_nbr] VARCHAR(8) NOT NULL,
    [pod_line] INT NOT NULL,
    [pod_part] VARCHAR(18) NOT NULL,
    [pod_um] CHAR(2) NULL,
    [pod_qty_ord] DECIMAL(18, 5) NOT NULL,
    [pod_qty_rcvd] DECIMAL(18, 5) NOT NULL,
    [pod_um_conv] DECIMAL(18, 5) NOT NULL,
    [pod_due_date] DATE NULL,
    [pod_status] CHAR(1) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: prh_det (Purchase Receipt Detail)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[prh_det](
    [prh_domain] VARCHAR(8) NOT NULL,
    [prh_nbr] VARCHAR(8) NOT NULL,
    [prh_line] INT NOT NULL,
    [prh_receiver] VARCHAR(8) NOT NULL,
    [prh_part] VARCHAR(18) NOT NULL,
    [prh_um] CHAR(2) NULL,
    [prh_rcvd] DECIMAL(18, 5) NOT NULL,
    [prh_um_conv] DECIMAL(18, 5) NOT NULL,
    [prh_rcp_date] DATE NULL,
    [prh_ps_nbr] VARCHAR(20) NULL,
    [prh_vend_lot] VARCHAR(18) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: ps_mstr (Product Structure Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[ps_mstr](
    [ps_domain] VARCHAR(8) NULL,
    [ps_par] VARCHAR(18) NULL,
    [ps_op] INT NULL,
    [ps_comp] VARCHAR(18) NULL,
    [ps_qty_per] DECIMAL(18, 9) NULL,
    [ps_scrp_pct] DECIMAL(5, 2) NULL,
    [ps_qty_per_b] DECIMAL(18, 9) NULL,
    [ps_start] DATE NULL,
    [ps_end] DATE NULL,
    [ps_qty_type] VARCHAR(1) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: pt_mstr (Part Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[pt_mstr](
    [pt_domain] VARCHAR(8) NULL,
    [pt_part] VARCHAR(18) NULL,
    [pt_desc1] VARCHAR(24) NULL,
    [pt_desc2] VARCHAR(24) NULL,
    [pt_um] VARCHAR(2) NULL,
    [pt_article] VARCHAR(18) NULL,
    [pt_status] VARCHAR(10) NULL,
    [pt_shelflife] INT NULL,
    [pt_added] DATE NULL,
    [pt__dec02] DECIMAL(10, 2) NULL,
    [pt_prod_line] VARCHAR(4) NULL,
    [pt_part_type] VARCHAR(8) NULL,
    [pt_group] VARCHAR(8) NULL,
    [pt_drwg_loc] VARCHAR(8) NULL,
    [pt_dsgn_grp] VARCHAR(8) NULL,
    [pt_promo] VARCHAR(10) NULL,
    [pt_pm_code] VARCHAR(1) NULL,
    [pt_bom_code] VARCHAR(18) NULL,
    [pt_routing] VARCHAR(18) NULL,
    [pt__chr09] VARCHAR(18) NULL,
    [pt_draw] VARCHAR(18) NULL,
    [pt_drwg_size] VARCHAR(2) NULL,
    [pt_break_cat] VARCHAR(18) NULL,
    [comd_comm_code] VARCHAR(20) NULL,
    [comm_desc] VARCHAR(24) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: qad_wkfl (QAD Workflow)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[qad_wkfl](
    [qad_domain] VARCHAR(8) NULL,
    [qad_key1] VARCHAR(10) NULL,
    [qad_key2] VARCHAR(8) NULL,
    [qad_charfld_01] VARCHAR(20) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: si_mstr (Site Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[si_mstr](
    [si_domain] VARCHAR(8) NULL,
    [si_site] VARCHAR(8) NULL,
    [si_desc] VARCHAR(24) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: so_mstr (Sales Order Master) - COMMANDES QAD
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[so_mstr](
    [so_id] INT IDENTITY(1,1) NOT NULL,
    [so_nbr] VARCHAR(8) NOT NULL,
    [so_site] VARCHAR(8) NOT NULL,
    [so_domain] VARCHAR(8) NULL,
    [so_cust] INT NOT NULL,
    [so_shipto] VARCHAR(8) NULL,
    [so_ord_date] DATETIME NOT NULL,
    [so_due_date] DATETIME NULL,
    [so_stat] CHAR(2) NOT NULL,
    [so_priority] INT NULL,
    [so_carrier] VARCHAR(8) NULL,
    [so_route] VARCHAR(8) NULL,
    [so_curr] VARCHAR(3) NULL,
    [so_total_amt] DECIMAL(18, 2) NULL,
    [so_created_by] VARCHAR(50) NULL,
    [so_created_date] DATETIME NULL,
    [so_updated_date] DATETIME NULL,
    [so_delivery_date] DATETIME NULL,
    [weight_per_carton] DECIMAL(18, 3) NULL,
    [weight_per_palette] DECIMAL(18, 3) NULL,
    [total_weight] DECIMAL(18, 3) NULL,
    [weight_unit] NVARCHAR(10) NULL,
    CONSTRAINT [PK_so_mstr] PRIMARY KEY CLUSTERED ([so_id] ASC)
        WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, 
              ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: sod_det (Sales Order Detail)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[sod_det](
    [sod_id] INT IDENTITY(1,1) NOT NULL,
    [sod_so_id] INT NOT NULL,
    [sod_line] INT NOT NULL,
    [sod_part] VARCHAR(18) NOT NULL,
    [sod_um] CHAR(2) NULL,
    [sod_qty_ord] DECIMAL(18, 5) NOT NULL,
    [sod_qty_rcvd] DECIMAL(18, 5) NULL,
    [sod_um_conv] DECIMAL(18, 5) NULL,
    [sod_due_date] DATETIME NULL,
    [sod_status] CHAR(1) NULL,
    CONSTRAINT [PK_sod_det] PRIMARY KEY CLUSTERED ([sod_id] ASC)
        WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, 
              ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: tr_hist (Transaction History)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[tr_hist](
    [tr_domain] VARCHAR(8) NOT NULL,
    [tr_trnbr] INT NOT NULL,
    [tr_type] CHAR(1) NOT NULL,
    [tr_ship_type] CHAR(2) NULL,
    [tr_effdate] DATE NULL,
    [tr_date] DATE NULL,
    [tr_time] INT NULL,
    [tr_part] VARCHAR(18) NOT NULL,
    [tr_site] VARCHAR(8) NOT NULL,
    [tr_loc] VARCHAR(8) NOT NULL,
    [tr_serial] VARCHAR(18) NULL,
    [tr_ref] VARCHAR(8) NULL,
    [tr_qty_loc] DECIMAL(18, 5) NOT NULL,
    [tr_um] CHAR(2) NULL,
    [tr_nbr] VARCHAR(18) NULL,
    [tr_line] INT NULL,
    [tr_lot] VARCHAR(8) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: um_mstr (Unit of Measure Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[um_mstr](
    [um_domain] VARCHAR(8) NULL,
    [um_part] VARCHAR(18) NULL,
    [um_conv] DECIMAL(18, 4) NULL,
    [um_um] VARCHAR(2) NULL,
    [um_alt_um] VARCHAR(2) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: vd_mstr (Vendor Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[vd_mstr](
    [vd_domain] VARCHAR(8) NULL,
    [vd_addr] VARCHAR(10) NULL,
    [AddressName] VARCHAR(36) NULL,
    [BusinessRelationName1] VARCHAR(36) NULL,
    [BusinessRelationName2] VARCHAR(36) NULL,
    [AddressStreet1] VARCHAR(36) NULL,
    [AddressStreet2] VARCHAR(36) NULL,
    [AddressStreet3] VARCHAR(36) NULL,
    [AddressCity] VARCHAR(20) NULL,
    [CountryCode] VARCHAR(20) NULL,
    [CountryDescription] VARCHAR(28) NULL,
    [AddressZip] VARCHAR(10) NULL,
    [CurrencyCode] VARCHAR(3) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: wo_mstr (Work Order Master)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[wo_mstr](
    [wo_domain] VARCHAR(8) NULL,
    [wo_nbr] VARCHAR(18) NULL,
    [wo_lot] VARCHAR(10) NULL,
    [wo_part] VARCHAR(18) NULL,
    [wo_status] VARCHAR(1) NULL,
    [wo_ord_date] DATE NULL,
    [wo_rel_date] DATE NULL,
    [wo_due_date] DATE NULL,
    [wo_qty_ord] DECIMAL(18, 2) NULL,
    [wo_qty_comp] DECIMAL(18, 2) NULL,
    [wo_qty_rjct] DECIMAL(18, 2) NULL,
    [wo_routing] VARCHAR(18) NULL,
    [wo_bom_code] VARCHAR(18) NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: wod_det (Work Order Detail)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[wod_det](
    [wod_domain] VARCHAR(8) NOT NULL,
    [wod_nbr] VARCHAR(18) NOT NULL,
    [wod_lot] VARCHAR(8) NOT NULL,
    [wod_part] VARCHAR(18) NOT NULL,
    [wod_op] INT NOT NULL,
    [wod_qty_req] DECIMAL(18, 5) NOT NULL,
    [wod_qty_iss] DECIMAL(18, 5) NOT NULL,
    [wod_bom_qty] DECIMAL(18, 5) NOT NULL
) ON [PRIMARY];
GO

-- ----------------------------------------------------------------------------
-- Table: wr_route (Work Route)
-- ----------------------------------------------------------------------------
CREATE TABLE [dbo].[wr_route](
    [wr_domain] VARCHAR(8) NOT NULL,
    [wr_nbr] VARCHAR(18) NOT NULL,
    [wr_lot] VARCHAR(8) NOT NULL,
    [wr_op] INT NOT NULL,
    [wr_desc] VARCHAR(24) NULL,
    [wr_route] VARCHAR(8) NOT NULL,
    [wr_mch] VARCHAR(8) NULL
) ON [PRIMARY];
GO

PRINT '✅ Toutes les tables créées avec succès';
GO

-- ============================================================================
-- Étape 5: Insertion des données d'exemple (optionnel)
-- ============================================================================
PRINT '📝 Insertion des données d''exemple...';

-- Exemple: Bill of Materials
INSERT INTO [dbo].[bom_mstr] ([bom_domain], [bom_parent], [bom_desc], [bom_batch], [bom_batch_um]) 
VALUES 
(N'ACOS', N'1100000000', N'350 SHAMP EXT FEMEND & C', CAST(12000.00 AS DECIMAL(18, 2)), N'PC'),
(N'ACOS', N'1100000001', N'350 SHAMP EXT FEMANTI-CHUTE VERT BLEUTE', CAST(12000.00 AS DECIMAL(18, 2)), N'PC');
GO

-- NOTE: Ajouter ici toutes les autres insertions nécessaires
-- Pour des raisons de longueur, seules quelques lignes d'exemple sont incluses

PRINT '✅ Données d''exemple insérées';
GO

-- ============================================================================
-- Étape 6: Création des contraintes de clé étrangère
-- ============================================================================
PRINT '🔗 Création des relations entre tables...';

-- Relation: so_mstr.so_cust → cm_mstr.cm_id (Commande → Client)
ALTER TABLE [dbo].[so_mstr] 
WITH NOCHECK ADD CONSTRAINT [FK_so_mstr_cm_mstr] 
FOREIGN KEY([so_cust]) REFERENCES [dbo].[cm_mstr] ([cm_id]);
GO

ALTER TABLE [dbo].[so_mstr] NOCHECK CONSTRAINT [FK_so_mstr_cm_mstr];
GO

-- Relation: sod_det.sod_so_id → so_mstr.so_id (Détail commande → Commande)
ALTER TABLE [dbo].[sod_det] 
WITH CHECK ADD CONSTRAINT [FK_sod_det_so_mstr] 
FOREIGN KEY([sod_so_id]) REFERENCES [dbo].[so_mstr] ([so_id]);
GO

ALTER TABLE [dbo].[sod_det] CHECK CONSTRAINT [FK_sod_det_so_mstr];
GO

PRINT '✅ Contraintes de clé étrangère créées';
GO

-- ============================================================================
-- Étape 7: Finalisation
-- ============================================================================
USE [master];
GO

ALTER DATABASE [QAD] SET READ_WRITE;
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════';
PRINT '✅ CRÉATION DE LA BASE QAD TERMINÉE AVEC SUCCÈS!';
PRINT '═══════════════════════════════════════════════════════';
PRINT '';
PRINT '📊 Récapitulatif:';
PRINT '   - Base de données: QAD';
PRINT '   - Tables créées: 20';
PRINT '   - Clés étrangères: 2';
PRINT '   - Compatibilité: SQL Server 2019 (niveau 150)';
PRINT '';
PRINT '🔗 Utilisation dans TMS:';
PRINT '   - ConnectionString: "Server=localhost;Database=QAD;Trusted_Connection=True;"';
PRINT '   - Tables principales:';
PRINT '     • cm_mstr: Clients QAD (synchronisés vers TMS)';
PRINT '     • so_mstr: Commandes de vente QAD (synchronisées vers TMS)';
PRINT '     • sod_det: Détails des commandes';
PRINT '';
PRINT '⚙️ Prochaines étapes:';
PRINT '   1. Configurer la chaîne de connexion dans appsettings.json';
PRINT '   2. Lancer la synchronisation QAD → TMS';
PRINT '   3. Vérifier les logs de synchronisation';
PRINT '═══════════════════════════════════════════════════════';
GO
