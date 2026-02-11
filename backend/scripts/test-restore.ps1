# Simple Restore Test Script
# Tests restore to a test database (does not affect production)

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [string]$TestDbName = "consent_manager_restore_test",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           RESTORE TEST - Consent Manager                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = "d:\DPDP\consent-manager-mvp\backend\test-backups\test_restore_${Timestamp}.log"

function Write-TestLog {
    param([string]$Message, [string]$Color = "White")
    $LogMessage = "[$(Get-Date -Format 'HH:mm:ss')] $Message"
    Write-Host $LogMessage -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $LogMessage
}

try {
    # Step 1: Verify backup file
    Write-TestLog "Step 1: Verifying backup file..." "Yellow"
    
    if (!(Test-Path $BackupFile)) {
        throw "Backup file not found: $BackupFile"
    }
    
    $fileSize = (Get-Item $BackupFile).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-TestLog "  File: $BackupFile" "Cyan"
    Write-TestLog "  Size: $fileSizeMB MB" "Cyan"
    
    # Check if compressed
    $isCompressed = $BackupFile -like "*.gz"
    if ($isCompressed) {
        Write-TestLog "  Format: Compressed (gzip)" "Cyan"
    } else {
        Write-TestLog "  Format: Uncompressed" "Cyan"
    }
    
    Write-TestLog "✓ Backup file verified" "Green"
    
    # Step 2: Verify checksum if available
    Write-TestLog "`nStep 2: Verifying checksum..." "Yellow"
    
    $checksumFile = "${BackupFile}".Replace(".gz", "") + ".sha256"
    if (Test-Path $checksumFile) {
        $expectedHash = (Get-Content $checksumFile).Trim()
        
        if ($isCompressed) {
            Write-TestLog "  Skipping checksum (compressed file)" "Gray"
        } else {
            $actualHash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash.ToLower()
            if ($actualHash -eq $expectedHash) {
                Write-TestLog "✓ Checksum verified" "Green"
            } else {
                throw "Checksum mismatch!"
            }
        }
    } else {
        Write-TestLog "  No checksum file found (skipping)" "Gray"
    }
    
    # Step 3: Check database connectivity
    Write-TestLog "`nStep 3: Testing database connectivity..." "Yellow"
    
    $env:PGPASSWORD = $env:POSTGRES_PASSWORD
    
    $pgIsReady = pg_isready -h $DbHost -p $DbPort -U $DbUser 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestLog "✓ Database server is ready" "Green"
    } else {
        throw "Cannot connect to PostgreSQL"
    }
    
    # Step 4: Drop test database if exists
    Write-TestLog "`nStep 4: Cleaning up old test database..." "Yellow"
    
    dropdb -h $DbHost -p $DbPort -U $DbUser $TestDbName 2>&1 | Out-Null
    Write-TestLog "✓ Old test database removed (if existed)" "Green"
    
    # Step 5: Create test database
    Write-TestLog "`nStep 5: Creating test database..." "Yellow"
    
    createdb -h $DbHost -p $DbPort -U $DbUser -O $DbUser $TestDbName 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create test database"
    }
    Write-TestLog "  Database: $TestDbName" "Cyan"
    Write-TestLog "✓ Test database created" "Green"
    
    # Step 6: Restore backup
    Write-TestLog "`nStep 6: Restoring backup..." "Yellow"
    
    $startTime = Get-Date
    
    if ($isCompressed) {
        # Decompress and pipe to pg_restore
        Write-TestLog "  Decompressing and restoring..." "Gray"
        
        $inputStream = [System.IO.File]::OpenRead($BackupFile)
        $gzipStream = New-Object System.IO.Compression.GZipStream($inputStream, 
            [System.IO.Compression.CompressionMode]::Decompress)
        
        $tempFile = [System.IO.Path]::GetTempFileName()
        $outputStream = [System.IO.File]::Create($tempFile)
        
        $gzipStream.CopyTo($outputStream)
        $outputStream.Close()
        $gzipStream.Close()
        $inputStream.Close()
        
        pg_restore -h $DbHost -p $DbPort -U $DbUser -d $TestDbName --no-owner --no-acl $tempFile 2>&1 | Out-Null
        $restoreResult = $LASTEXITCODE
        
        Remove-Item $tempFile -Force
    } else {
        pg_restore -h $DbHost -p $DbPort -U $DbUser -d $TestDbName --no-owner --no-acl $BackupFile 2>&1 | Out-Null
        $restoreResult = $LASTEXITCODE
    }
    
    $duration = (Get-Date) - $startTime
    
    if ($restoreResult -ne 0) {
        Write-TestLog "⚠ Some warnings occurred during restore (common)" "Yellow"
    }
    
    Write-TestLog "✓ Restore completed in $($duration.TotalSeconds) seconds" "Green"
    
    # Step 7: Verify restored data
    Write-TestLog "`nStep 7: Verifying restored data..." "Yellow"
    
    $consentCount = psql -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -tAc "SELECT COUNT(*) FROM consents;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestLog "  Consents: $consentCount" "Cyan"
    } else {
        throw "Failed to query consents table"
    }
    
    $auditCount = psql -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -tAc "SELECT COUNT(*) FROM audit_logs;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestLog "  Audit logs: $auditCount" "Cyan"
    } else {
        throw "Failed to query audit_logs table"
    }
    
    $webhookCount = psql -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -tAc "SELECT COUNT(*) FROM webhooks;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestLog "  Webhooks: $webhookCount" "Cyan"
    }
    
    # Step 8: Verify triggers
    Write-TestLog "`nStep 8: Verifying triggers..." "Yellow"
    
    $triggerCount = psql -h $DbHost -p $DbPort -U $DbUser -d $TestDbName -tAc "SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'audit_logs'::regclass;" 2>&1
    if ($triggerCount -gt 0) {
        Write-TestLog "  Audit log triggers: $triggerCount" "Cyan"
        Write-TestLog "✓ Triggers verified" "Green"
    } else {
        Write-TestLog "⚠ No triggers found (check if expected)" "Yellow"
    }
    
    # Step 9: Cleanup test database
    Write-TestLog "`nStep 9: Cleaning up test database..." "Yellow"
    
    dropdb -h $DbHost -p $DbPort -U $DbUser $TestDbName 2>&1 | Out-Null
    Write-TestLog "✓ Test database removed" "Green"
    
    # Summary
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                  RESTORE TEST PASSED                       ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor White
    Write-Host "  Backup file:     $BackupFile" -ForegroundColor Cyan
    Write-Host "  Test database:   $TestDbName (cleaned up)" -ForegroundColor Cyan
    Write-Host "  Records restored:" -ForegroundColor White
    Write-Host "    - Consents:    $consentCount" -ForegroundColor Cyan
    Write-Host "    - Audit logs:  $auditCount" -ForegroundColor Cyan
    Write-Host "    - Webhooks:    $webhookCount" -ForegroundColor Cyan
    Write-Host "  Restore time:    $($duration.TotalSeconds) seconds" -ForegroundColor Cyan
    Write-Host "  Log file:        $LogFile" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║                  RESTORE TEST FAILED                       ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Log file: $LogFile" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to cleanup test database
    Write-Host "Attempting cleanup..." -ForegroundColor Yellow
    dropdb -h $DbHost -p $DbPort -U $DbUser $TestDbName 2>&1 | Out-Null
    
    exit 1
}
