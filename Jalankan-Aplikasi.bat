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
echo.

node server.js
pause
