Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "       DESPLIEGUE AUTOMATICO A SYNAPSIS-EDU.WEB.APP       " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Rutas de Node
$env:Path += ";C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;$env:APPDATA\npm;$env:LOCALAPPDATA\Programs\node"

# 2. Limpieza de cache corrupto
$brokenPath = "$env:APPDATA\npm\node_modules\firebase-tools"
if (Test-Path $brokenPath) {
    Write-Host "[1/4] Limpiando instalacion previa de firebase-tools..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $brokenPath -ErrorAction SilentlyContinue
}
Get-ChildItem -Path "$env:APPDATA\npm\firebase*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# 3. Compilacion
Write-Host "[2/4] Instalando dependencias..." -ForegroundColor Green
npm install --no-audit --prefer-offline

Write-Host "[3/4] Compilando la aplicacion (generando dist/)..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error durante la compilacion. Revisa los mensajes anteriores." -ForegroundColor Red
    pause
    exit
}

# 4. Despliegue
Write-Host "[4/4] Desplegando en Firebase Hosting..." -ForegroundColor Green
npx -y firebase-tools deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  EXITO! Abre tu aplicacion en: https://synapsis-edu.web.app/" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
} else {
    Write-Host "Si requieres iniciar sesion, ejecuta: npx -y firebase-tools login" -ForegroundColor Yellow
}
pause
