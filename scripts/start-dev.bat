@echo off
title SupliList v4.0 — Dev Server
cd /d "%~dp0"
echo Limpando cache do Vite...
rmdir /s /q "node_modules\.vite" 2>nul
echo Iniciando servidor de desenvolvimento...
npm run dev
pause
