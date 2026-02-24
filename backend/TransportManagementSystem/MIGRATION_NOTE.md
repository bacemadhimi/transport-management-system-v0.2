# Database Migration Required

## Change Summary
The `Truck` entity has been updated to support multiple images instead of a single image.

## Database Schema Changes

### Old Schema
- Column: `ImageBase64` (string, nullable)
- Stores: Single base64 encoded image

### New Schema
- Column: `ImagesJson` (string, nullable)
- Stores: JSON array of base64 encoded images

## Migration Steps

### Option 1: Using Entity Framework Core Migrations

Run the following commands in the `TransportManagementSystem` directory:

```bash
# Create a new migration
dotnet ef migrations add ConvertImageBase64ToImagesJson

# Review the migration file (it will be created in Migrations folder)

# Apply the migration
dotnet ef database update
```

### Option 2: Manual SQL Migration

If you need to preserve existing image data, run this SQL script:

```sql
-- For SQL Server
BEGIN TRANSACTION;

-- Add the new column
ALTER TABLE Trucks ADD ImagesJson NVARCHAR(MAX) NULL;

-- Migrate existing single images to JSON array format
UPDATE Trucks 
SET ImagesJson = CASE 
    WHEN ImageBase64 IS NOT NULL AND ImageBase64 != '' 
    THEN '["' + ImageBase64 + '"]'
    ELSE NULL 
END
WHERE ImageBase64 IS NOT NULL;

-- Drop the old column
ALTER TABLE Trucks DROP COLUMN ImageBase64;

COMMIT TRANSACTION;
```

### Option 3: Fresh Database (Development Only)

If you're in development and don't need to preserve data:

```bash
# Drop the database and recreate
dotnet ef database drop
dotnet ef database update
```

## Important Notes

1. **Backup your database** before running any migration
2. The migration will convert existing single images to a JSON array with one element
3. Existing API clients will need to be updated to handle the new `images` array format
4. Frontend applications have been updated to support multiple image uploads

## Testing the Migration

After migration, verify:
1. Existing trucks with images still display correctly
2. New trucks can add multiple images
3. Images can be added/removed individually
4. Export functions (CSV, Excel, PDF) work correctly

## Rollback Instructions

If you need to rollback:

```bash
dotnet ef database update <PreviousMigrationName>
dotnet ef migrations remove
```

Or manually:

```sql
-- Revert the changes
ALTER TABLE Trucks ADD ImageBase64 NVARCHAR(MAX) NULL;

UPDATE Trucks 
SET ImageBase64 = JSON_VALUE(ImagesJson, '$[0]')
WHERE ImagesJson IS NOT NULL;

ALTER TABLE Trucks DROP COLUMN ImagesJson;
```
