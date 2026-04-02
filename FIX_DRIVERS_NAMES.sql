-- ============================================
-- CORRECTION DEFINITIVE - NOMS DES CHAUFFEURS
-- Base de données: TMS
-- Table: Employees
-- ============================================

USE TMS;
GO

-- 1. Vérifier l'état actuel
PRINT '=== État actuel des chauffeurs ===';
SELECT Id, IdNumber, Name, Email, PhoneNumber, EmployeeCategory 
FROM Employees 
WHERE EmployeeCategory = 'DRIVER' 
ORDER BY Id;
GO

-- 2. Mettre à jour avec des noms réels
PRINT '=== Mise à jour des noms des chauffeurs ===';

UPDATE Employees SET Name = 'Ahmed Ben Ali' WHERE IdNumber = 'DRV-1001';
UPDATE Employees SET Name = 'Yassine Bouaziz' WHERE IdNumber = 'DRV-1002';
UPDATE Employees SET Name = 'Sami Trabelsi' WHERE IdNumber = 'DRV-1003';
UPDATE Employees SET Name = 'Mohamed Gharbi' WHERE IdNumber = 'DRV-1004';
UPDATE Employees SET Name = 'Ali Hamdi' WHERE IdNumber = 'DRV-1005';
UPDATE Employees SET Name = 'Hichem Jaziri' WHERE IdNumber = 'DRV-1006';
UPDATE Employees SET Name = 'Karim Mejri' WHERE IdNumber = 'DRV-1007';
UPDATE Employees SET Name = 'Walid Ayari' WHERE IdNumber = 'DRV-1008';
UPDATE Employees SET Name = 'Omar Dridi' WHERE IdNumber = 'DRV-1009';
UPDATE Employees SET Name = 'Bilel Kacem' WHERE IdNumber = 'DRV-1010';
UPDATE Employees SET Name = 'Amine Sassi' WHERE IdNumber = 'DRV-1011';
UPDATE Employees SET Name = 'Rami Bouzid' WHERE IdNumber = 'DRV-1012';
UPDATE Employees SET Name = 'Fares Khiari' WHERE IdNumber = 'DRV-1013';
UPDATE Employees SET Name = 'Bassem Ouni' WHERE IdNumber = 'DRV-1014';
UPDATE Employees SET Name = 'Nabil Gharbi' WHERE IdNumber = 'DRV-1015';
GO

-- 3. Vérifier le résultat
PRINT '=== Résultat après mise à jour ===';
SELECT Id, IdNumber, Name, Email, PhoneNumber, EmployeeCategory 
FROM Employees 
WHERE EmployeeCategory = 'DRIVER' 
ORDER BY Id;
GO

PRINT '=== Correction terminée avec succès! ===';
GO
