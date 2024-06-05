@echo off
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
	echo This setup needs admin permissions. Please run this file as admin.
    echo.
	pause
	exit
)
set winget_ver=null
for /F "tokens=*" %%G in ('node -v') do @set winget_ver=%%G
IF %winget_ver% == null (
    echo Please install winget first.
    echo You can download it from here:
    echo https://apps.microsoft.com/detail/9nblggh4nns1
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
call node -v
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
echo.
echo Setting a scheduler tast to start the server on boot...
schtasks  /create /tn "Google Contacts Sync Server" /tr "\"%userprofile%\Google-Contacts-Sync-Yealink\launcher.bat\"" /sc onlogon /ru %USERNAME% /f
echo.
echo Setup complete! You can now run the run.bat file.
echo.
pause
