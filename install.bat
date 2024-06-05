@echo off
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
	echo This setup needs admin permissions. Please run this file as admin.
    echo.
	pause
	exit
)
set NODE_VER=null
for /F "tokens=*" %%G in ('node -v') do @set NODE_VER=%%G
IF %NODE_VER% == null (
    echo Downloading Node.js...
    echo.
    curl -L -s "https://nodejs.org/dist/v20.14.0/node-v20.14.0-x64.msi" -o node-insatller.msi
    echo Installing node.js...
    echo.
    start /W node-insatller.msi /passive
    del node-insatller.msi
)
echo Node.js installed! node version:
node -v
echo.
echo Installing Git...
echo.
winget install --id Git.Git -e --source winget
echo.
echo Downloading source files...
echo.
cd %userprofile%
call git clone https://github.com/joshuamargareten/Google-Contacts-Sync-Yealink.git
cd Google-Contacts-Sync-Yealink
echo.
echo Installing dependencies...
echo.
call npm i --silent
pause
