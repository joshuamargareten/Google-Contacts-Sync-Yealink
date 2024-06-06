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

IF NOT DEFINED GIT_VER (
    echo Installing Git...
    echo.
    tar -xf PortableGit.zip
    echo.
    cd PortableGit/cmd
    for /F "tokens=*" %%G in ('call git.exe -v') do @set GIT_VER=%%G
    IF NOT DEFINED GIT_VER (
    echo.
    echo Git did not install, please install git manually and run this file again.
    echo.
    echo You can download GIT here:
    echo https://www.git-scm.com/download/win
    echo.
    pause
    exit
    )
    echo Downloading source files...
    echo.
    mkdir %userprofile%\Google-Contacts-Sync-Yealink
    call git.exe clone https://github.com/joshuamargareten/Google-Contacts-Sync-Yealink.git %userprofile%\Google-Contacts-Sync-Yealink
) else (
    echo Downloading source files...
    echo.
    call git clone https://github.com/joshuamargareten/Google-Contacts-Sync-Yealink.git %userprofile%\Google-Contacts-Sync-Yealink
)
cd %userprofile%\Google-Contacts-Sync-Yealink
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
