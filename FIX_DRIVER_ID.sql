-- ============================================
-- FIX: Driver ID Mismatch Problem
-- ============================================
-- Problem: User ID (14) != Driver ID (12)
-- Solution: Link Driver 12 to User 14
-- ============================================

USE TransportManagementSystem;
GO

-- 1. Check current state
PRINT '=== Current State ===';
SELECT 
    u.Id AS UserId,
    u.Email AS UserEmail,
    d.Id AS DriverId,
    d.Name AS DriverName,
    d.Email AS DriverEmail
FROM Users u
LEFT JOIN Drivers d ON u.Email = d.Email
WHERE u.Email = 'anis12@tms.demo' OR d.Email = 'anis12@tms.demo';
GO

-- 2. Check trips for this driver
PRINT '=== Trips for anis12@tms.demo ===';
SELECT 
    t.Id AS TripId,
    t.TripReference,
    t.DriverId,
    t.TripStatus,
    d.Name AS DriverName
FROM Trips t
INNER JOIN Drivers d ON t.DriverId = d.Id
WHERE d.Email = 'anis12@tms.demo'
ORDER BY t.CreatedAt DESC;
GO

-- 3. FIX: Update Driver to link to User 14
PRINT '=== Applying Fix ===';
UPDATE Drivers 
SET user_id = 14  -- Link to User ID 14
WHERE Id = 12 AND Email = 'anis12@tms.demo';
GO

-- 4. Verify the fix
PRINT '=== After Fix ===';
SELECT 
    u.Id AS UserId,
    u.Email AS UserEmail,
    d.Id AS DriverId,
    d.Name AS DriverName,
    d.Email AS DriverEmail,
    d.user_id AS LinkedUserId
FROM Users u
INNER JOIN Drivers d ON u.Email = d.Email
WHERE u.Email = 'anis12@tms.demo';
GO

-- 5. Verify trips are now accessible
PRINT '=== Verify Trips Accessible ===';
SELECT 
    t.Id AS TripId,
    t.TripReference,
    t.DriverId,
    t.TripStatus,
    d.Name AS DriverName,
    d.user_id AS LinkedUserId
FROM Trips t
INNER JOIN Drivers d ON t.DriverId = d.Id
WHERE d.user_id = 14
ORDER BY t.CreatedAt DESC;
GO

PRINT '=== Fix Complete! ===';
PRINT 'Now logout and login again to get the correct driverId in the token.';
GO
