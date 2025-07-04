@echo off
echo 🔧 LOBISOMEM ONLINE - Quick Fix Script
echo =====================================

cd /d "%~dp0"

echo 🧹 Limpando cache e node_modules...
rmdir /s /q node_modules 2>nul
rmdir /s /q .next 2>nul
del package-lock.json 2>nul

echo 📦 Reinstalando dependências...
npm install

echo 📁 Criando estrutura de assets...
mkdir public\sounds 2>nul
mkdir public\music 2>nul  
mkdir public\images 2>nul

echo. > public\sounds\button_click.mp3
echo. > public\music\medieval_tavern.mp3
echo. > public\favicon.ico
echo. > public\favicon-16x16.png
echo. > public\favicon-32x32.png

echo {"name":"Lobisomem Online","short_name":"Lobisomem","start_url":"/","display":"standalone","background_color":"#2D1B1E","theme_color":"#8B925A"} > public\site.webmanifest

echo ✅ Correções aplicadas!
echo 🚀 Execute "npm run dev" para testar

pause