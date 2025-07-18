@echo off
echo ========================================
echo    INICIANDO WHATSAPP FRONTEND
echo ========================================
echo.

cd whatsapp-admin

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias del frontend...
    npm install
    if errorlevel 1 (
        echo Error al instalar dependencias del frontend
        pause
        exit /b 1
    )
)

echo.
echo Iniciando servidor frontend en puerto 4200...
echo El navegador se abrira automaticamente
echo Presiona Ctrl+C para detener el servidor
echo.

npm start

pause