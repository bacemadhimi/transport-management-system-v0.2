# 🚀 Script: Build APK Mobile TMS - TEST LOCAL
# Utilise ton IP locale (192.168.41.186) sans toucher aux fichiers existants

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build APK Local - TEST CHEZ TOI" -ForegroundColor Cyan
Write-Host "  IP: 192.168.41.186" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est dans le bon dossier
if (-not (Test-Path "TMS-MobileApp")) {
    Write-Host "❌ Erreur: Dossier TMS-MobileApp non trouvé!" -ForegroundColor Red
    Write-Host "Exécutez ce script depuis la racine du projet." -ForegroundColor Yellow
    exit 1
}

Set-Location TMS-MobileApp

Write-Host "🔨 Étape 1/3: Build Angular avec configuration LOCAL..." -ForegroundColor Yellow
ionic build --configuration=local

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec du build Angular!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build Angular réussi!" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Étape 2/3: Synchronisation Capacitor..." -ForegroundColor Yellow
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec de la synchronisation Capacitor!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Synchronisation réussie!" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Étape 3/3: Build APK Debug..." -ForegroundColor Yellow
Set-Location android
.\gradlew assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Échec du build Gradle!" -ForegroundColor Red
    exit 1
}

Set-Location ..\..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ APK Local Build Terminé!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apkPath = "TMS-MobileApp\android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "📱 APK: $apkPath" -ForegroundColor Green
    Write-Host "📏 Taille: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
    Write-Host "🌐 API: http://192.168.41.186:5191" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Pour tester:" -ForegroundColor Yellow
    Write-Host "  1. Phone et PC sur le même WiFi" -ForegroundColor White
    Write-Host "  2. Backend doit tourner sur le PC" -ForegroundColor White
    Write-Host "  3. adb install $apkPath" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  APK non trouvé" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
