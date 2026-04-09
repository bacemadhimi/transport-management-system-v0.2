# 🚀 Script: Build APK Mobile TMS
# Exécuter depuis le dossier racine du projet

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build APK Mobile TMS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est dans le bon dossier
if (-not (Test-Path "TMS-MobileApp")) {
    Write-Host "❌ Erreur: Dossier TMS-MobileApp non trouvé!" -ForegroundColor Red
    Write-Host "Exécutez ce script depuis la racine du projet." -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Navigation vers TMS-MobileApp..." -ForegroundColor Green
Set-Location TMS-MobileApp

Write-Host ""
Write-Host "🔨 Étape 1/3: Build Angular avec configuration device..." -ForegroundColor Yellow
ionic build --configuration=device

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

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ APK Build Terminé!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "📱 APK généré: $apkPath" -ForegroundColor Green
    Write-Host "📏 Taille: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "  1. Transférez cet APK sur votre téléphone Android" -ForegroundColor White
    Write-Host "  2. Installez l'APK" -ForegroundColor White
    Write-Host "  3. Assurez-vous que le backend tourne sur votre PC" -ForegroundColor White
    Write-Host "  4. Connectez téléphone et PC au même WiFi" -ForegroundColor White
    Write-Host "  5. Ouvrez l'app et testez le login!" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Astuce: Utilisez ADB pour installer directement" -ForegroundColor Cyan
    Write-Host "   adb install $apkPath" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  APK non trouvé à l'emplacement attendu" -ForegroundColor Yellow
    Write-Host "Vérifiez le dossier android/app/build/outputs/apk/debug/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
