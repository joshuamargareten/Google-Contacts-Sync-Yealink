@echo off
for /F "tokens=*" %%G IN ('curl 127.0.0.1:6005/test -s') DO set pingResult=%%G
echo Please make a selection:
IF NOT DEFINED pingResult (echo 1. Start the program) else (echo 1. Stop the program)
echo 2. List instences of the program
CHOICE /c 12 /N
cls
IF %ERRORLEVEL% EQU 2 npm run list & pause
IF %ERRORLEVEL% EQU 1 (
    IF DEFINED pingResult (
        npm run stop & pause
    ) else (
        npm run start & pause
    )
)
