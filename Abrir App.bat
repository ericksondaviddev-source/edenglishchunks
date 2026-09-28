@echo off
setlocal EnableExtensions
title Ingles con Chunks - servidor local

cd /d "%~dp0"

if not exist "index.html" (
  echo No se encontro "index.html" junto a este archivo.
  echo Coloca "Abrir App.bat" dentro de la carpeta de la app y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)

set "PY="
python -c "import sys" >nul 2>nul && set "PY=python"
if not defined PY py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY (
  echo Se necesita Python para servir la app.
  echo Instalalo desde https://www.python.org/downloads/ y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

set "PORT="
for %%P in (8765 8766 8767 8768 8769) do (
  if not defined PORT (
    powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1',%%P); $c.Close(); exit 1 } catch { exit 0 }" >nul 2>nul
    if not errorlevel 1 set "PORT=%%P"
  )
)

if not defined PORT (
  echo No se encontro un puerto libre entre 8765 y 8769.
  echo Cierra otros programas que puedan usar esos puertos y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)

set "MENAME=%~nx0"

start /b "" %PY% -m http.server %PORT% --bind 127.0.0.1 >nul 2>nul

start "" powershell -NoProfile -WindowStyle Hidden -Command "$me='%MENAME%'; $p=(Get-CimInstance Win32_Process -Filter ProcessId=$PID).ParentProcessId; $pr=Get-CimInstance Win32_Process -Filter ProcessId=$p; if (-not ($pr -and $pr.CommandLine -like ('*' + $me + '*'))) { exit 0 }; $i=0; while ($i -lt 900 -and (Get-Process -Id $p -ErrorAction SilentlyContinue)) { Start-Sleep -Seconds 2; $i++ }; $l=Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if ($l) { Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue }"

set /a tries=0
:esperar
set /a tries+=1
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%PORT%/index.html' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto listo
if %tries% GEQ 15 goto fallo
timeout /t 1 /nobreak >nul
goto esperar

:listo
start "" "http://127.0.0.1:%PORT%/index.html"
echo.
echo  Servidor local activo: http://127.0.0.1:%PORT%/index.html
echo  La app quedo abierta en tu navegador.
echo.
echo  Para cerrar la app, cierra esta ventana.
echo  El servidor se detiene junto con ella.
echo.
pause
goto parar

:fallo
echo El servidor no arranco a tiempo en el puerto %PORT%.
echo.

:parar
powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if ($c) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul
endlocal
