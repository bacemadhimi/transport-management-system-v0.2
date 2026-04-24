# ============================================================================
# Script: Add-TunisiaGeographicalEntities.ps1
# Description: Ajoute automatiquement les 24 gouvernorats de Tunisie avec GPS
# Usage: .\Add-TunisiaGeographicalEntities.ps1
# ============================================================================

Write-Host "=== Ajout automatique des 24 gouvernorats de Tunisie ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$projectPath = "c:\Users\khamm\transport-management-system-v0.2\backend\TransportManagementSystem"
Set-Location $projectPath

# Liste des gouvernorats avec coordonnées GPS (latitude, longitude)
$governorates = @(
    @{Name="Tunis"; Code="TUN"; Lat=36.8065; Lon=10.1815},
    @{Name="Sfax"; Code="SFX"; Lat=34.7406; Lon=10.7603},
    @{Name="Sousse"; Code="SOU"; Lat=35.8256; Lon=10.6369},
    @{Name="Kairouan"; Code="KAI"; Lat=35.6781; Lon=10.0963},
    @{Name="Bizerte"; Code="BIZ"; Lat=37.2744; Lon=9.8739},
    @{Name="Gabès"; Code="GAB"; Lat=33.8815; Lon=10.0982},
    @{Name="Ariana"; Code="ARI"; Lat=36.8625; Lon=10.1956},
    @{Name="Gafsa"; Code="GAF"; Lat=34.4250; Lon=8.7842},
    @{Name="Monastir"; Code="MON"; Lat=35.7643; Lon=10.8113},
    @{Name="Ben Arous"; Code="BAR"; Lat=36.7547; Lon=10.2181},
    @{Name="Kasserine"; Code="KAS"; Lat=35.1678; Lon=8.8369},
    @{Name="Médenine"; Code="MED"; Lat=33.3547; Lon=10.5053},
    @{Name="Nabeul"; Code="NAB"; Lat=36.4561; Lon=10.7378},
    @{Name="Tataouine"; Code="TAT"; Lat=32.9297; Lon=10.4517},
    @{Name="Béja"; Code="BEJ"; Lat=36.7256; Lon=9.1817},
    @{Name="Jendouba"; Code="JEN"; Lat=36.5011; Lon=8.7803},
    @{Name="Siliana"; Code="SIL"; Lat=36.0847; Lon=9.3706},
    @{Name="Le Kef"; Code="KEF"; Lat=36.1742; Lon=8.7050},
    @{Name="Mahdia"; Code="MAH"; Lat=35.5047; Lon=11.0622},
    @{Name="Tozeur"; Code="TOZ"; Lat=33.9197; Lon=8.1339},
    @{Name="Kébili"; Code="KEB"; Lat=33.7044; Lon=8.9692},
    @{Name="Zaghouan"; Code="ZAG"; Lat=36.4028; Lon=10.1428},
    @{Name="Manouba"; Code="MAN"; Lat=36.8089; Lon=10.0972}
)

Write-Host "📊 Total gouvernorats à ajouter: $($governorates.Count)" -ForegroundColor Yellow
Write-Host ""

# Vérifier si dotnet est disponible
try {
    $dotnetVersion = dotnet --version
    Write-Host "✅ DotNet version: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur: DotNet n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Construction du projet..." -ForegroundColor Cyan
dotnet build --no-restore | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec de la construction du projet" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build réussi" -ForegroundColor Green
Write-Host ""

# Créer un programme C# temporaire pour insérer les données
$tempFile = [System.IO.Path]::GetTempFileName() + ".cs"

$programCode = @"
using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TransportManagementSystem.Data;
using TransportManagementSystem.Entity;

class Program
{
    static void Main(string[] args)
    {
        var serviceProvider = new ServiceCollection()
            .AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=TMS;Trusted_Connection=True;"))
            .BuildServiceProvider();

        using (var scope = serviceProvider.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            // Trouver ou créer le niveau géographique par défaut
            var defaultLevel = dbContext.GeographicalLevels.FirstOrDefault();
            if (defaultLevel == null)
            {
                Console.WriteLine("⚠️ Aucun GeographicalLevel trouvé. Création d'un niveau par défaut...");
                defaultLevel = new GeographicalLevel
                {
                    Name = "Gouvernorat",
                    IsMappable = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.GeographicalLevels.Add(defaultLevel);
                dbContext.SaveChanges();
                Console.WriteLine("✅ Niveau 'Gouvernorat' créé");
            }

            // Gouvernorats à ajouter
            var governorates = new[]
            {
                new { Name = "Tunis", Lat = 36.8065m, Lon = 10.1815m },
                new { Name = "Sfax", Lat = 34.7406m, Lon = 10.7603m },
                new { Name = "Sousse", Lat = 35.8256m, Lon = 10.6369m },
                new { Name = "Kairouan", Lat = 35.6781m, Lon = 10.0963m },
                new { Name = "Bizerte", Lat = 37.2744m, Lon = 9.8739m },
                new { Name = "Gabès", Lat = 33.8815m, Lon = 10.0982m },
                new { Name = "Ariana", Lat = 36.8625m, Lon = 10.1956m },
                new { Name = "Gafsa", Lat = 34.4250m, Lon = 8.7842m },
                new { Name = "Monastir", Lat = 35.7643m, Lon = 10.8113m },
                new { Name = "Ben Arous", Lat = 36.7547m, Lon = 10.2181m },
                new { Name = "Kasserine", Lat = 35.1678m, Lon = 8.8369m },
                new { Name = "Médenine", Lat = 33.3547m, Lon = 10.5053m },
                new { Name = "Nabeul", Lat = 36.4561m, Lon = 10.7378m },
                new { Name = "Tataouine", Lat = 32.9297m, Lon = 10.4517m },
                new { Name = "Béja", Lat = 36.7256m, Lon = 9.1817m },
                new { Name = "Jendouba", Lat = 36.5011m, Lon = 8.7803m },
                new { Name = "Siliana", Lat = 36.0847m, Lon = 9.3706m },
                new { Name = "Le Kef", Lat = 36.1742m, Lon = 8.7050m },
                new { Name = "Mahdia", Lat = 35.5047m, Lon = 11.0622m },
                new { Name = "Tozeur", Lat = 33.9197m, Lon = 8.1339m },
                new { Name = "Kébili", Lat = 33.7044m, Lon = 8.9692m },
                new { Name = "Zaghouan", Lat = 36.4028m, Lon = 10.1428m },
                new { Name = "Manouba", Lat = 36.8089m, Lon = 10.0972m }
            };

            int added = 0;
            int updated = 0;
            int skipped = 0;

            foreach (var gov in governorates)
            {
                var existing = dbContext.GeographicalEntities.FirstOrDefault(g => g.Name == gov.Name);
                
                if (existing == null)
                {
                    // Ajouter nouveau
                    var entity = new GeographicalEntity
                    {
                        Name = gov.Name,
                        LevelId = defaultLevel.Id,
                        Latitude = gov.Lat,
                        Longitude = gov.Lon,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    dbContext.GeographicalEntities.Add(entity);
                    added++;
                    Console.WriteLine($"✅ {gov.Name} ajouté");
                }
                else if (existing.Latitude == null || existing.Longitude == null)
                {
                    // Mettre à jour les coordonnées manquantes
                    existing.Latitude = gov.Lat;
                    existing.Longitude = gov.Lon;
                    existing.IsActive = true;
                    existing.UpdatedAt = DateTime.UtcNow;
                    updated++;
                    Console.WriteLine($"ℹ️ {gov.Name} mis à jour (coordonnées ajoutées)");
                }
                else
                {
                    skipped++;
                    Console.WriteLine($"⏭️ {gov.Name} existe déjà avec coordonnées");
                }
            }

            dbContext.SaveChanges();

            Console.WriteLine("");
            Console.WriteLine("=== Résumé ===");
            Console.WriteLine($"✅ Ajoutés: {added}");
            Console.WriteLine($"ℹ️ Mis à jour: {updated}");
            Console.WriteLine($"⏭️ Déjà existants: {skipped}");
            Console.WriteLine($"📊 Total: {dbContext.GeographicalEntities.Count(g => g.IsActive)} entités actives");
        }
    }
}
"@

# Écrire le code temporaire
[System.IO.File]::WriteAllText($tempFile, $programCode)

Write-Host "🚀 Exécution du script d'insertion..." -ForegroundColor Cyan
Write-Host ""

# Compiler et exécuter
try {
    # Créer un projet console temporaire
    $tempProjectDir = Join-Path $env:TEMP "GeoEntitySeeder"
    if (Test-Path $tempProjectDir) {
        Remove-Item $tempProjectDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempProjectDir | Out-Null
    
    # Copier le fichier de programme
    Copy-Item $tempFile (Join-Path $tempProjectDir "Program.cs")
    
    # Créer le fichier .csproj
    $csprojContent = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net9.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="$projectPath\TransportManagementSystem.csproj" />
  </ItemGroup>
</Project>
"@
    [System.IO.File]::WriteAllText((Join-Path $tempProjectDir "GeoSeeder.csproj"), $csprojContent)
    
    # Exécuter
    Set-Location $tempProjectDir
    dotnet run
    
    $exitCode = $LASTEXITCODE
    
    # Nettoyer
    Set-Location $projectPath
    Remove-Item $tempProjectDir -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ Script terminé avec succès !" -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 Prochaines étapes:" -ForegroundColor Yellow
        Write-Host "   1. Redémarrez le backend: dotnet run" -ForegroundColor White
        Write-Host "   2. Créez/modifiez un client avec une adresse en Tunisie" -ForegroundColor White
        Write-Host "   3. Vérifiez que l'entité géographique est automatiquement assignée" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Le script a échoué avec le code de sortie: $exitCode" -ForegroundColor Red
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors de l'exécution: $_" -ForegroundColor Red
    Set-Location $projectPath
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    exit 1
}
