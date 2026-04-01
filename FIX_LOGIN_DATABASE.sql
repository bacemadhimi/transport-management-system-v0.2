-- Script pour ajouter les colonnes manquantes dans la table Drivers
-- Problème: Invalid column name 'Driver_Status' et 'user_id'

-- Vérifier si la table Drivers existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Drivers')
BEGIN
    PRINT 'La table Drivers n''existe pas!'
    RETURN
END

-- Ajouter la colonne Status si elle n'existe pas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Drivers') AND name = 'Status')
BEGIN
    ALTER TABLE Drivers ADD Status NVARCHAR(50) NULL
    PRINT 'Colonne Status ajoutée à la table Drivers'
END
ELSE
BEGIN
    PRINT 'La colonne Status existe déjà'
END

-- Ajouter la colonne user_id si elle n'existe pas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Drivers') AND name = 'user_id')
BEGIN
    ALTER TABLE Drivers ADD user_id INT NULL
    PRINT 'Colonne user_id ajoutée à la table Drivers'
    
    -- Ajouter la contrainte de clé étrangère
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Drivers_Users_user_id')
    BEGIN
        ALTER TABLE Drivers ADD CONSTRAINT FK_Drivers_Users_user_id 
        FOREIGN KEY (user_id) REFERENCES Users(Id)
        PRINT 'Contrainte FK_Drivers_Users_user_id ajoutée'
    END
END
ELSE
BEGIN
    PRINT 'La colonne user_id existe déjà'
END

-- Vérifier les colonnes de la table Drivers
PRINT '--- Colonnes actuelles de la table Drivers ---'
SELECT c.name AS ColumnName, t.name AS DataType, c.max_length AS MaxLength, c.is_nullable AS IsNullable
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('Drivers')
ORDER BY c.column_id
