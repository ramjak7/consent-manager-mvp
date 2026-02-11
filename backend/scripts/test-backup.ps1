# Simple Backup Test Script for Consent Manager
# Tests local backup functionality without cloud upload

param(
    [string]$DbName = "consent_manager",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$BackupDir = "d:\DPDP\consent-manager-mvp\backend\test-backups"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     BACKUP TEST - Consent Manager" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "${DbName}_test_${Timestamp}.dump"
$LogFile = Join-Path $BackupDir "test_backup_${Timestamp}.log"

function Write-TestLog {
    param([string]$Message, [string]$Color = "White")
    $LogMessage = "[$(Get-Date -Format 'HH:mm:ss')] $Message"
    Write-Host $LogMessage -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $LogMessage
}

try {
    # Step 1: Check prerequisites
    Write-TestLog "Step 1: Checking prerequisites..." "Yellow"
    
    if (!(Get-Command pg_dump -ErrorAction SilentlyContinue)) {
        throw "pg_dump not found. Install PostgreSQL client tools."
    }
    Write-TestLog "  pg_dump found" "Green"
    
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        Write-TestLog "  Backup directory created: $BackupDir" "Green"
    } else {
        Write-TestLog "  Backup directory exists" "Green"
    }
    
    # Step 2: Test database connectivity
    Write-TestLog "" "White"
    Write-TestLog "Step 2: Testing database connectivity..." "Yellow"
    
    $pgIsReady = pg_isready -h $DbHost -p $DbPort -U $DbUser 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestLog "  Database is ready" "Green"
    } else {
        throw "Cannot connect to PostgreSQL at ${DbHost}:${DbPort}"
    }
    
    # Step 3: Get database stats before backup
    Write-TestLog "" "White"
    Write-TestLog "Step 3: Gathering database statistics..." "Yellow"
    
    $env:PGPASSWORD = $env:POSTGRES_PASSWORD
    
    $count1 = psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -tAc "SELECT COUNT(*) FROM consents;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestLog "  Consents: $count1" "Cyan"
    }
    
    $count2 = psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -tAc "SELECT COUNT(*) FROM audit_logs;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestLog "  Audit logs: $count2" "Cyan"
    }
    
    # Step 4: Perform backup
    Write-TestLog "" "White"
    Write-TestLog "Step 4: Performing pg_dump..." "Yellow"
    Write-TestLog "  Output: $BackupFile" "Gray"
    
    $startTime = Get-Date
    
    pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -b -f $BackupFile 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
    
    $duration = (Get-Date) - $startTime
    Write-TestLog "  Backup completed in $($duration.TotalSeconds) seconds" "Green"
    
    # Step 5: Verify backup
    Write-TestLog "" "White"
    Write-TestLog "Step 5: Verifying backup..." "Yellow"
    
    if (!(Test-Path $BackupFile)) {
        throw "Backup file not created"
    }
    
    $fileSize = (Get-Item $BackupFile).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-TestLog "  File size: $fileSizeMB MB" "Cyan"
    
    if ($fileSize -lt 1KB) {
        throw "Backup file suspiciously small"
    }
    
    # Step 6: Calculate checksum
    Write-TestLog "" "White"
    Write-TestLog "Step 6: Calculating checksum..." "Yellow"
    
    $hash = Get-FileHash -Path $BackupFile -Algorithm SHA256
    $checksum = $hash.Hash.ToLower()
    $checksumFile = "${BackupFile}.sha256"
    $checksum | Out-File -FilePath $checksumFile -Encoding ASCII
    Write-TestLog "  SHA-256: $($checksum.Substring(0, 16))..." "Cyan"
    
    # Step 7: Test pg_restore --list
    Write-TestLog "" "White"
    Write-TestLog "Step 7: Testing backup integrity..." "Yellow"
    
    $listOutput = pg_restore --list $BackupFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        $tableCount = ($listOutput | Select-String "TABLE DATA").Count
        Write-TestLog "  Tables in backup: $tableCount" "Cyan"
        Write-TestLog "  Backup file is valid" "Green"
    } else {
        throw "pg_restore --list failed"
    }
    
    # Step 8: Compress backup
    Write-TestLog "" "White"
    Write-TestLog "Step 8: Compressing backup..." "Yellow"
    
    $compressStart = Get-Date
    
    # Use .NET compression
    $inputStream = [System.IO.File]::OpenRead($BackupFile)
    $outputStream = [System.IO.File]::Create("${BackupFile}.gz")
    $gzipStream = New-Object System.IO.Compression.GZipStream($outputStream, 
        [System.IO.Compression.CompressionMode]::Compress)
    
    $inputStream.CopyTo($gzipStream)
    $gzipStream.Close()
    $outputStream.Close()
    $inputStream.Close()
    
    $compressDuration = (Get-Date) - $compressStart
    
    Remove-Item $BackupFile -Force
    $BackupFile = "${BackupFile}.gz"
    
    $compressedSize = (Get-Item $BackupFile).Length
    $compressedSizeMB = [math]::Round($compressedSize / 1MB, 2)
    $compressionRatio = [math]::Round((1 - ($compressedSize / $fileSize)) * 100, 1)
    
    Write-TestLog "  Compressed size: $compressedSizeMB MB" "Cyan"
    Write-TestLog "  Compression ratio: $compressionRatio%" "Cyan"
    Write-TestLog "  Time: $($compressDuration.TotalSeconds) seconds" "Cyan"
    Write-TestLog "  Compression complete" "Green"
    
    # Summary
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "          BACKUP TEST PASSED" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results:" -ForegroundColor White
    Write-Host "  Backup file:     $BackupFile" -ForegroundColor Cyan
    Write-Host "  Checksum file:   $checksumFile" -ForegroundColor Cyan
    Write-Host "  Log file:        $LogFile" -ForegroundColor Cyan
    Write-Host "  Final size:      $compressedSizeMB MB" -ForegroundColor Cyan
    $totalTime = $duration.TotalSeconds + $compressDuration.TotalSeconds
    Write-Host "  Total time:      $totalTime seconds" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host "           BACKUP TEST FAILED" -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Log file: $LogFile" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
