@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH.
  exit /b 1
)
node tests\static-contract.test.js
if errorlevel 1 exit /b 1
node tests\routeGraph.test.js
if errorlevel 1 exit /b 1
echo.
echo All Dark Ride Simulator tests passed.
