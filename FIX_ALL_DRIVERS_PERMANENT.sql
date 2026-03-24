-- ============================================
-- FIX PERMANENT: Auto-Link ALL Drivers to Users
-- ============================================
-- This script links ALL drivers to their corresponding users
-- Run this ONCE after deploying the fix
-- ============================================

USE TMS;
GO

PRINT '========================================';
PRINT 'FIX PERMANENT: Link All Drivers to Users';
PRINT '========================================';
PRINT '';

-- Show current state
PRINT '=== BEFORE FIX: Drivers without user_id ===';
SELECT 
    d.Id AS DriverId,
    d.Name AS DriverName,
    d.Email AS DriverEmail,
    d.user_id AS CurrentUserId,
    u.Id AS MatchingUserId,
    u.Name AS MatchingUserName
FROM Drivers d
LEFT JOIN Users u ON d.Email = u.Email
WHERE d.user_id IS NULL;
PRINT '';

-- FIX: Update ALL drivers without user_id
PRINT '=== Applying Fix... ===';
UPDATE d
SET d.user_id = u.Id
FROM Drivers d
INNER JOIN Users u ON d.Email = u.Email
WHERE d.user_id IS NULL AND u.Id IS NOT NULL;

DECLARE @fixedCount INT = @@ROWCOUNT;
PRINT '';
PRINT '========================================';
PRINT 'FIX APPLIED: ' + CAST(@fixedCount AS VARCHAR) + ' drivers linked to users';
PRINT '========================================';
PRINT '';

-- Verify the fix
PRINT '=== AFTER FIX: All Drivers with user_id ===';
SELECT 
    d.Id AS DriverId,
    d.Name AS DriverName,
    d.Email AS DriverEmail,
    d.user_id AS LinkedUserId,
    u.Name AS LinkedUserName
FROM Drivers d
INNER JOIN Users u ON d.user_id = u.Id
ORDER BY d.Id;
PRINT '';

-- Show any remaining issues
PRINT '=== Remaining Issues (if any) ===';
SELECT 
    d.Id AS DriverId,
    d.Name AS DriverName,
    d.Email AS DriverEmail,
    'No matching user found' AS Issue
FROM Drivers d
WHERE d.user_id IS NULL;
PRINT '';

PRINT '========================================';
PRINT 'FIX COMPLETE!';
PRINT '========================================';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Restart the backend';
PRINT '2. Ask drivers to logout and login again';
PRINT '3. Pages "Mes Trajets" and "Historique" will work automatically!';
PRINT '';
GO
