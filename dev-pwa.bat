@echo off
echo Starting EFD React App with PWA enabled...
echo.
echo This will enable Progressive Web App features for testing:
echo - Service Worker registration
echo - App install prompts
echo - Offline functionality
echo - Caching
echo.
echo Visit http://localhost:3000 after startup
echo Look for the install prompt in the bottom-left corner
echo.
set ENABLE_PWA=true
npm run dev
