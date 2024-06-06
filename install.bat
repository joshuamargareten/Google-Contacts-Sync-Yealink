@echo off
title Google Contacts Sync Yealink Setup
echo.
echo Checking for admin permissions...
echo.
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
	echo This setup needs admin permissions. Please run this file as admin.
    echo.
	pause
	exit
)

for /F "tokens=*" %%G in ('node -v') do @set NODE_VER=%%G
IF NOT DEFINED NODE_VER (
    echo Downloading Node.js...
    echo.
    curl -L -s "https://nodejs.org/dist/v20.14.0/node-v20.14.0-x64.msi" -o node-insatller.msi
    echo Installing node.js...
    echo.
    start /W node-insatller.msi /passive
    del node-insatller.msi
    echo.
    echo Node Installed! please run this file again to continue.
    echo.
    echo Press any key to Exit.
    pause >null
    exit
)

echo Node.js installed! node version:
call node -v
echo.

if exist %userprofile%\Google-Contacts-Sync-Yealink rmdir /s /q %userprofile%\Google-Contacts-Sync-Yealink

for /F "tokens=*" %%G in ('git -v') do @set GIT_VER=%%G
echo.

set winget_ver=null
for /F "tokens=*" %%G in ('winget -v') do @set winget_ver=%%G

IF NOT DEFINED GIT_VER (
    IF NOT DEFINED winget_ver (
        echo.
        echo Please install git or winget first.
        echo You can download winget from here:
        echo https://apps.microsoft.com/detail/9nblggh4nns1
        echo or check alernative ways to install it here:
        echo https://phoenixnap.com/kb/install-winget
        echo.
        pause
        exit
    )
    echo Installing Git...
    echo.
    winget install --id Git.Git -e --source winget
    echo.
)

echo Downloading source files...
echo.
cd %userprofile%
call git clone https://github.com/joshuamargareten/Google-Contacts-Sync-Yealink.git
cd Google-Contacts-Sync-Yealink
echo.
echo Installing dependencies...
echo.
call npm i --silent
echo.
echo Setting a scheduler tast to start the server on boot...
schtasks  /create /tn "Google Contacts Sync Server" /tr "\"%userprofile%\Google-Contacts-Sync-Yealink\launcher.bat\"" /sc onlogon /ru %USERNAME% /f
echo.
echo Setup complete! You can now run the run.bat file.
echo.
pause
