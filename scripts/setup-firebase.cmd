@echo off
setlocal
cd /d "%~dp0.."

echo Signing in to Firebase. Use the Google account that owns the ths-medical1 project.
call npx --yes firebase-tools login
if errorlevel 1 goto failed

echo Deploying Email/Password Authentication and the Firestore rules...
call npx --yes firebase-tools deploy --only auth,firestore:rules --project ths-medical1
if errorlevel 1 goto failed

echo Firebase setup completed.
pause
exit /b 0

:failed
echo Firebase setup did not finish. Check the message above, then try again.
pause
exit /b 1
