@echo off
setlocal enabledelayedexpansion

:: =====================================================
::   EcoSynTech IoT Platform - Auto Installer (Windows)
::   Version: 2.0.0
:: =====================================================

set "APP_NAME=ecosyntech"
set "INSTALL_DIR=%CD%"
set "LOG_FILE=%INSTALL_DIR%\install.log"

:: Colors (PowerShell)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:check_admin
    net session >nul 2>&1
    if %errorLevel% neq 0 (
        echo [WARN] Nen chay voi quyen Administrator de tao service
        timeout /t 2 >nul
    )

:check_prerequisites
    cls
    echo =====================================================
    echo   Kiem tra yeu cau he thong
    echo =====================================================
    echo.

    :: Check Node.js
    where node >nul 2>&1
    if %errorLevel% equ 0 (
        for /f "delims=" %%i in ('node -v') do set "NODE_VERSION=%%i"
        echo [INFO] Node.js: %NODE_VERSION%
    ) else (
        echo [ERROR] Node.js chua duoc cai dat!
        echo Vui long cai dat Node.js tu: https://nodejs.org/
        pause
        exit /b 1
    )

    :: Check npm
    where npm >nul 2>&1
    if %errorLevel% equ 0 (
        for /f "delims=" %%i in ('npm -v') do set "NPM_VERSION=%%i"
        echo [INFO] npm: %NPM_VERSION%
    ) else (
        echo [ERROR] npm chua duoc cai dat!
        pause
        exit /b 1
    )

    :: Check Python for some packages
    where python >nul 2>&1
    if %errorLevel% equ 0 (
        for /f "delims=" %%i in ('python --version') do set "PY_VERSION=%%i"
        echo [INFO] Python: %PY_VERSION%
    )

    echo.
    echo [SUCCESS] Tat ca yeu cau da duoc dap ung!
    timeout /t 2 >nul

:configure_system
    cls
    echo =====================================================
    echo   Cau hinh he thong
    echo =====================================================
    echo.
    echo Nhan Enter de su dung gia tri mac dinh [trong ngoac]
    echo.

    :: Port
    set /p USER_PORT="Port cho server [3000]: "
    if "!USER_PORT!"=="" set "PORT=3000" || set "PORT=!USER_PORT!"

    :: JWT Secret
    set /p USER_JWT_SECRET="JWT Secret (de trong = tu dong tao): "
    if "!USER_JWT_SECRET!"=="" (
        :: Generate random string
        set "CHARS=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        set "JWT_SECRET="
        for /L %%a in (1,1,64) do (
            set /a "idx=!random! %% 62"
            for %%b in (!idx!) do set "JWT_SECRET=!JWT_SECRET!!CHARS:~%%b,1!"
        )
    ) else (
        set "JWT_SECRET=!USER_JWT_SECRET!"
    )

    :: Environment
    set /p USER_ENV="Moi truong (development/production) [development]: "
    if "!USER_ENV!"=="" set "NODE_ENV=development" || set "NODE_ENV=!USER_ENV!"

    :: CORS
    set /p USER_CORS="CORS Origin (URL frontend, * = moi noi) [*]: "
    if "!USER_CORS!"=="" set "CORS_ORIGIN=*" || set "CORS_ORIGIN=!USER_CORS!"

    :: Admin Email
    set /p ADMIN_EMAIL="Email admin mac dinh [admin@ecosyntech.vn]: "
    if "!ADMIN_EMAIL!"=="" set "ADMIN_EMAIL=admin@ecosyntech.vn"

    :: Admin Password
    powershell -Command "$p = Read-Host -AsSecureString 'Password admin (de trong = tu dong tao)'; $b = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); $pass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($b); Write-Output $pass" > "%TEMP%\admin_pass.txt"
    set /p ADMIN_PASSWORD=<"%TEMP%\admin_pass.txt"
    del "%TEMP%\admin_pass.txt" >nul 2>&1
    if "!ADMIN_PASSWORD!"=="" (
        set "CHARS=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$"
        set "ADMIN_PASSWORD="
        for /L %%a in (1,1,20) do (
            set /a "idx=!random! %% 45"
            for %%b in (!idx!) do set "ADMIN_PASSWORD=!ADMIN_PASSWORD!!CHARS:~%%b,1!"
        )
    )

    :: Display summary
    echo.
    echo === Tom tat cau hinh ===
    echo   Port:          !PORT!
    echo   Environment:   !NODE_ENV!
    echo   CORS Origin:   !CORS_ORIGIN!
    echo   Admin Email:    !ADMIN_EMAIL!
    echo   JWT Secret:    !JWT_SECRET:~0,20!...
    echo   Admin Password: !ADMIN_PASSWORD:~0,10!...
    echo.
    set /p CONFIRM="Xac nhan cau hinh? [Y/n]: "
    if /i "!CONFIRM!"=="n" (
        echo Huy cai dat.
        exit /b 0
    )

:create_env_file
    cls
    echo =====================================================
    echo   Tao file cau hinh
    echo =====================================================
    echo.

    (
        echo # EcoSynTech IoT Platform - Environment Configuration
        echo.
        echo PORT=!PORT!
        echo NODE_ENV=!NODE_ENV!
        echo LOG_LEVEL=info
        echo.
        echo DB_PATH=./data/ecosyntech.db
        echo.
        echo JWT_SECRET=!JWT_SECRET!
        echo JWT_EXPIRES_IN=7d
        echo.
        echo CORS_ORIGIN=!CORS_ORIGIN!
        echo.
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
        echo.
        echo WEBHOOK_SECRET=!JWT_SECRET!
    ) > .env

    echo [SUCCESS] Da tao file .env
    timeout /t 1 >nul

:install_dependencies
    cls
    echo =====================================================
    echo   Cai dat Dependencies
    echo =====================================================
    echo.

    if exist "node_modules" (
        echo node_modules da ton tai.
        set /p REINSTALL="Xoa va cai lai? [y/N]: "
        if /i "!REINSTALL!"=="y" (
            rmdir /s /q node_modules 2>nul
            del package-lock.json 2>nul
        )
    )

    echo Dang cai dat npm packages...
    call npm install
    if %errorLevel% neq 0 (
        echo [ERROR] Cai dat that bai!
        pause
        exit /b 1
    )

    echo.
    echo [SUCCESS] Cai dat dependencies thanh cong!
    timeout /t 2 >nul

:init_database
    cls
    echo =====================================================
    echo   Khoi tao Database
    echo =====================================================
    echo.

    if not exist "data" mkdir data
    if not exist "logs" mkdir logs

    echo Dang khoi tao database...
    start /b "" node server.js >nul 2>&1
    timeout /t 5 >nul
    taskkill /f /im node.exe >nul 2>&1

    echo.
    echo [SUCCESS] Database da duoc khoi tao!

:save_credentials
    cls
    echo =====================================================
    echo   Luu thong tin dang nhap
    echo =====================================================
    echo.

    (
        echo ====================================================
        echo   EcoSynTech IoT Platform - Thong tin dang nhap
        echo   Generated: %date% %time%
        echo ====================================================
        echo.
        echo ## Admin Account
        echo Email: !ADMIN_EMAIL!
        echo Password: !ADMIN_PASSWORD!
        echo.
        echo ## Server
        echo URL: http://localhost:!PORT!
        echo API: http://localhost:!PORT!/api
        echo.
        echo ## Configuration
        echo Port: !PORT!
        echo Environment: !NODE_ENV!
        echo Database: !INSTALL_DIR!\data\ecosyntech.db
        echo.
        echo ## Quick Commands
        echo npm start           - Chay server
        echo npm run dev         - Development mode
        echo.
        echo ## API Endpoints
        echo GET  /api/health    - Health check
        echo GET  /api/sensors   - List sensors
        echo GET  /api/devices   - List devices
        echo GET  /api/stats     - System stats
        echo POST /api/auth/login - Login
        echo.
        echo ====================================================
    ) > .credentials

    echo [SUCCESS] Da luu thong tin vao .credentials
    timeout /t 2 >nul

:test_installation
    cls
    echo =====================================================
    echo   Kiem tra cai dat
    echo =====================================================
    echo.

    echo Khoi dong server de kiem tra...
    start /b "" node server.js >nul 2>&1
    timeout /t 5 >nul

    curl -s http://localhost:!PORT!/api/health >nul 2>&1
    if %errorLevel% equ 0 (
        echo [SUCCESS] Server hoat dong tot!
        echo.
        echo === Health Check ===
        curl -s http://localhost:!PORT!/api/health
        echo.
        echo.
        echo === Stats ===
        curl -s http://localhost:!PORT!/api/stats
        echo.
    ) else (
        echo [WARN] Server chua phan hoi, co the can them thoi gian...
        timeout /t 3 >nul
        curl -s http://localhost:!PORT!/api/health
    )

    taskkill /f /im node.exe >nul 2>&1

:print_summary
    cls
    echo.
    echo =====================================================
    echo   Hoan tat cai dat!
    echo =====================================================
    echo.
    echo   EcoSynTech IoT Platform da duoc cai dat!
    echo.
    echo   Thu muc: %INSTALL_DIR%
    echo   Port:    !PORT!
    echo   URL:     http://localhost:!PORT!
    echo.
    echo   Tai khoan Admin:
    echo   Email:    !ADMIN_EMAIL!
    echo   Password: !ADMIN_PASSWORD!
    echo.
    echo   File cau hinh: .env
    echo   File credentials: .credentials
    echo.
    echo   === Quick Start ===
    echo   npm start     - Chay server
    echo   npm run dev   - Development mode
    echo.
    echo =====================================================
    echo.
    echo CANH BAO: Luu thong tin dang nhap tu file .credentials!
    echo.

    pause
endlocal
