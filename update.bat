@echo off
echo ==============================================
echo Updating Employment Dashboard Data
echo ==============================================

echo [1/3] Fetching latest Statistics Canada data...
node fetchData.js

echo.
echo [2/3] Adding changes to Git...
git add .
git commit -m "Update monthly employment data"

echo.
echo [3/3] Pushing updates to GitHub...
git push origin main

echo.
echo ==============================================
echo Successfully updated the dashboard!
echo ==============================================
pause
