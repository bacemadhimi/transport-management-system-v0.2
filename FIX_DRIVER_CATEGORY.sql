-- Script pour corriger les chauffeurs qui n'ont pas la bonne catégorie
-- Exécuter dans SQL Server Management Studio ou Azure Data Studio

-- Option 1: Mettre à jour tous les employés sans catégorie pour les définir comme DRIVER
UPDATE Employees
SET EmployeeCategory = 'DRIVER'
WHERE EmployeeCategory IS NULL 
   OR EmployeeCategory = ''
   AND (Name LIKE '%chauffeur%' OR Name LIKE '%driver%' OR IdNumber IS NOT NULL);

-- Option 2: Si vous connaissez les IDs des chauffeurs, mettez-les à jour manuellement
-- UPDATE Employees SET EmployeeCategory = 'DRIVER' WHERE Id IN (1, 2, 3, ...);

-- Vérifier le résultat
SELECT 
    Id,
    Name,
    Email,
    EmployeeCategory,
    IsEnable,
    Status
FROM Employees
WHERE EmployeeCategory = 'DRIVER'
ORDER BY Id;
