@echo off
title Catet Nomer & Voucher
cls
echo ========================================================
echo        MEMULAI APLIKASI CATET NOMER & VOUCHER
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [PERINGATAN] Node.js tidak ditemukan di komputer ini!
    echo Membuka aplikasi langsung di browser...
    start "" "index.html"
    exit /b
)

echo Memulai server lokal...
echo Buka di browser: http://localhost:3000
echo.

start "" "http://localhost:3000"
node server.js
pause
