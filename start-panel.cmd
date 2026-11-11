@echo off
setlocal
cd /d "%~dp0"
title T2208 - Painel de Controle

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nao encontrado.
  echo Instale o Node.js LTS em https://nodejs.org/ e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo Instalando dependencias pela primeira vez...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo Falha no npm install.
    pause
    exit /b 1
  )
)

echo.
echo Abrindo a ponte e o painel...
start "T2208 - Ponte" cmd /k "npm run dev -- --lan --port 5173 --strictPort"
timeout /t 5 /nobreak >nul
start "" http://127.0.0.1:5173/

echo.
echo Painel neste PC:    http://127.0.0.1:5173/
echo Tablet/celular:    http://IP_DESTE_PC:5173/
echo.
echo A janela "T2208 - Ponte" precisa ficar aberta.
echo Feche-a para encerrar o painel.
echo.
pause
