@echo off
for /F "tokens=*" %%G IN ('curl 127.0.0.1:6005/test -s') DO set pingResult=%%G
IF NOT DEFINED pingResult ( npm run start )