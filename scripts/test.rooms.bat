@echo off
echo 🐺 LOBISOMEM ONLINE - Room API Testing (Windows)
echo =============================================

REM Verificar se o servidor está rodando
echo Checking if server is running...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Server is not running at http://localhost:3001
    echo Start the server with: npm run dev
    pause
    exit /b 1
)
echo ✅ Server is running

REM Executar testes básicos
echo.
echo Testing basic endpoints...

REM 1. Health check
echo Testing health endpoint...
curl -s http://localhost:3001/health

echo.
echo 🔐 Testing authentication...

REM 2. Register test user
curl -s -X POST http://localhost:3001/api/auth/register ^
-H "Content-Type: application/json" ^
-d "{\"email\":\"testuser@rooms.com\",\"username\":\"RoomTester\",\"password\":\"Test123!\",\"confirmPassword\":\"Test123!\"}"

echo.
echo 🏠 Testing room creation...

REM 3. Login to get token (simplified - in real scenario you'd parse the JSON)
echo Login and get token manually to continue testing...
echo.
echo ✅ Basic tests completed!
echo.
echo 📋 Manual testing steps:
echo 1. Login at: POST http://localhost:3001/api/auth/login
echo 2. Copy the accessToken from response
echo 3. Use token in Authorization header for room endpoints
echo 4. Test: GET http://localhost:3001/api/rooms
echo 5. Test: POST http://localhost:3001/api/rooms with room data
echo.
echo For complete automated testing, run the Linux script or use Postman
pause