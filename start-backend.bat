@echo off
echo ========================================
echo    INICIANDO WHATSAPP BACKEND
echo ========================================
echo.

cd whatsapp-backend

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias del backend...
    npm install
    if errorlevel 1 (
        echo Error al instalar dependencias del backend
        pause
        exit /b 1
    )
)

echo.
echo Seleccione el modo de ejecucion:
echo 1. Modo Desarrollo (sin WhatsApp Web - recomendado para pruebas)
echo 2. Modo Produccion (con WhatsApp Web - requiere conexion estable)
echo.
set /p choice="Ingrese su opcion (1 o 2): "

if "%choice%"=="1" (
    echo.
    echo Iniciando servidor en MODO DESARROLLO...
    echo - WhatsApp Web no se conectara
    echo - Todas las funciones de la API estaran disponibles
    echo - Puerto: 3000
    echo.
    npm start
) else if "%choice%"=="2" (
    echo.
    echo Iniciando servidor en MODO PRODUCCION...
    echo - WhatsApp Web se conectara automaticamente
    echo - Escanee el codigo QR cuando aparezca
    echo - Puerto: 3000
    echo.
    npm run prod
) else (
    echo Opcion invalida. Iniciando en modo desarrollo por defecto...
    npm start
)

pause