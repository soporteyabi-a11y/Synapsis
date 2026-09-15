@echo off
title Despliegue Synapsis Edu a Firebase
color 0b
echo =========================================================
echo       DESPLIEGUE AUTOMATICO A SYNAPSIS-EDU.WEB.APP
echo =========================================================
echo.

:: 1. Agregar todas las rutas posibles de Node.js en Windows
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\node;%LOCALAPPDATA%\Programs\nodejs;%USERPROFILE%\AppData\Roaming\npm;%USERPROFILE%\AppData\Local\Programs\node"

:: 2. Eliminar instalacion corrupta previa de firebase-tools que causa el error "semver"
echo [1/4] Verificando y limpiando archivos temporales...
if exist "%APPDATA%\npm\node_modules\firebase-tools" (
    echo Limpiando instalacion corrupta de firebase-tools...
    rmdir /s /q "%APPDATA%\npm\node_modules\firebase-tools" 2>nul
)
del /f /q "%APPDATA%\npm\firebase*" 2>nul

:: 3. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ERROR: No se encontro Node.js en el sistema.
    echo Por favor instala o reinstala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 4. Compilar la aplicacion (genera la carpeta dist/)
echo.
echo [2/4] Instalando dependencias necesarias...
call npm install --no-audit --prefer-offline

echo.
echo [3/4] Compilando la aplicacion (generando dist/)...
call npm run build
if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ERROR: La compilacion fallo. Revisa los mensajes de arriba.
    pause
    exit /b 1
)

:: 5. Desplegar en Firebase Hosting
echo.
echo [4/4] Subiendo archivos a Firebase Hosting (synapsis-edu.web.app)...
call npx -y firebase-tools deploy --only hosting

if %errorlevel% equ 0 (
    color 0a
    echo.
    echo =========================================================
    echo   EXITO! Tu aplicacion esta desplegada en:
    echo   https://synapsis-edu.web.app/
    echo =========================================================
) else (
    echo.
    echo Si el error indico que necesitas iniciar sesion, ejecuta:
    echo call npx -y firebase-tools login
)

echo.
pause
