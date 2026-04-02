-- Vérifier les chauffeurs dans la base de données
SELECT 
    Id,
    Name,
    Email,
    EmployeeCategory,
    IsEnable,
    Status,
    IdNumber,
    PhoneNumber
FROM Employees
WHERE EmployeeCategory = 'DRIVER' OR EmployeeCategory IS NULL
ORDER BY Id;

-- Compter les chauffeurs
SELECT 
    EmployeeCategory,
    COUNT(*) as Count
FROM Employees
GROUP BY EmployeeCategory;

-- Vérifier si la table est vide
SELECT COUNT(*) as TotalEmployees FROM Employees;
