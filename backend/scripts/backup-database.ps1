# PostgreSQL Backup Script for Consent Manager (Windows)
# This script performs automated daily backups with cloud storage upload
#
# Usage: .\backup-database.ps1
# Requirements: PostgreSQL client tools, AWS CLI or Azure CLI

param(
    [string]$DbName = $env:DB_NAME ?? "consent_manager",
    [string]$DbUser = $env:DB_USER ?? "postgres",
    [string]$DbHost = $env:DB_HOST ?? "localhost",
    [int]$DbPort = [int]($env:DB_PORT ?? 5432),
    [string]$BackupDir = $env:BACKUP_DIR ?? "C:\backups\postgresql",
    [string]$S3Bucket = $env:S3_BUCKET ?? "s3://cmp-backups",
    [int]$RetentionDays = [int]($env:RETENTION_DAYS ?? 30)
)

$ErrorActionPreference = "Stop"

# Variables
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "${DbName}_${Timestamp}.dump"
$LogFile = Join-Path $BackupDir "backup_${Timestamp}.log"
$ChecksumFile = "${BackupFile}.sha256"

# Functions
function Write-Log {
    param([string]$Message)
    $LogMessage = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

function Exit-WithError {
    param([string]$Message)
    Write-Log "ERROR: $Message"
    
    # Send failure metric
    try {
        $Body = @{
            status = "failure"
            error = $Message
            timestamp = $Timestamp
        } | ConvertTo-Json
        
        Invoke-RestMethod -Method POST -Uri "http://localhost:3000/metrics/backup" `
            -ContentType "application/json" -Body $Body -ErrorAction SilentlyContinue
    } catch {
        Write-Log "WARNING: Failed to send failure metrics"
    }
    
    exit 1
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check if pg_dump exists
    if (!(Get-Command pg_dump -ErrorAction SilentlyContinue)) {
        Exit-WithError "pg_dump not found. Install PostgreSQL client tools."
    }
    
    # Check if AWS CLI exists (if using S3)
    if ($S3Bucket -like "s3://*" -and !(Get-Command aws -ErrorAction SilentlyContinue)) {
        Exit-WithError "AWS CLI not found. Install AWS CLI."
    }
    
    # Check database connectivity
    $pgIsReady = pg_isready -h $DbHost -p $DbPort -U $DbUser 2>&1
    if ($LASTEXITCODE -ne 0) {
        Exit-WithError "Cannot connect to PostgreSQL at ${DbHost}:${DbPort}"
    }
    
    Write-Log "Prerequisites check passed"
}

function New-BackupDirectory {
    if (!(Test-Path $BackupDir)) {
        Write-Log "Creating backup directory: $BackupDir"
        try {
            New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        } catch {
            Exit-WithError "Failed to create backup directory: $_"
        }
    }
}

function Invoke-Backup {
    Write-Log "Starting pg_dump for database: $DbName"
    
    try {
        $env:PGPASSWORD = $env:POSTGRES_PASSWORD
        
        pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName `
            -F c -b -v -f $BackupFile 2>&1 | Tee-Object -FilePath $LogFile -Append
        
        if ($LASTEXITCODE -ne 0) {
            throw "pg_dump failed with exit code $LASTEXITCODE"
        }
        
        Write-Log "pg_dump completed successfully"
    } catch {
        Exit-WithError "pg_dump failed: $_"
    }
}

function Test-Backup {
    Write-Log "Verifying backup integrity..."
    
    # Check if backup file exists
    if (!(Test-Path $BackupFile)) {
        Exit-WithError "Backup file not created: $BackupFile"
    }
    
    # Check file size
    $FileSize = (Get-Item $BackupFile).Length
    if ($FileSize -lt 1KB) {
        Exit-WithError "Backup file suspiciously small: $FileSize bytes"
    }
    
    $FileSizeFormatted = "{0:N2} MB" -f ($FileSize / 1MB)
    Write-Log "Backup file size: $FileSizeFormatted"
    
    # Calculate SHA-256 checksum
    $Hash = Get-FileHash -Path $BackupFile -Algorithm SHA256
    $Checksum = $Hash.Hash.ToLower()
    $Checksum | Out-File -FilePath $ChecksumFile -Encoding ASCII
    Write-Log "Backup checksum (SHA-256): $Checksum"
    
    return $Checksum
}

function Compress-Backup {
    Write-Log "Compressing backup..."
    
    try {
        $CompressedFile = "${BackupFile}.gz"
        
        # Use 7-Zip if available, otherwise use .NET compression
        if (Get-Command 7z -ErrorAction SilentlyContinue) {
            7z a -tgzip -mx=9 $CompressedFile $BackupFile | Out-Null
        } else {
            # Use .NET GZipStream
            $InputStream = [System.IO.File]::OpenRead($BackupFile)
            $OutputStream = [System.IO.File]::Create($CompressedFile)
            $GzipStream = New-Object System.IO.Compression.GZipStream($OutputStream, 
                [System.IO.Compression.CompressionMode]::Compress)
            
            $InputStream.CopyTo($GzipStream)
            $GzipStream.Close()
            $OutputStream.Close()
            $InputStream.Close()
        }
        
        # Remove uncompressed file
        Remove-Item $BackupFile -Force
        
        $CompressedSize = (Get-Item $CompressedFile).Length
        $CompressedSizeFormatted = "{0:N2} MB" -f ($CompressedSize / 1MB)
        Write-Log "Compression complete. Compressed size: $CompressedSizeFormatted"
        
        return $CompressedFile
    } catch {
        Exit-WithError "Compression failed: $_"
    }
}

function Send-ToCloud {
    param([string]$FilePath)
    
    Write-Log "Uploading to cloud storage: $S3Bucket"
    
    try {
        # Upload backup file
        aws s3 cp $FilePath "${S3Bucket}/daily/" --storage-class STANDARD_IA 2>&1 | 
            Tee-Object -FilePath $LogFile -Append
        
        if ($LASTEXITCODE -ne 0) {
            throw "S3 upload failed"
        }
        
        Write-Log "Backup uploaded successfully"
        
        # Upload checksum file
        aws s3 cp $ChecksumFile "${S3Bucket}/daily/" 2>&1 | Out-Null
        
        # Verify upload
        $FileName = Split-Path $FilePath -Leaf
        $S3Check = aws s3 ls "${S3Bucket}/daily/${FileName}" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Upload verification successful"
        } else {
            throw "Upload verification failed"
        }
    } catch {
        Exit-WithError "Cloud upload failed: $_"
    }
}

function New-MonthlyBackup {
    param([string]$FilePath)
    
    $DayOfMonth = (Get-Date).Day
    if ($DayOfMonth -eq 1) {
        Write-Log "Creating monthly backup copy..."
        aws s3 cp $FilePath "${S3Bucket}/monthly/" 2>&1 | Tee-Object -FilePath $LogFile -Append
        Write-Log "Monthly copy created"
    }
}

function Remove-OldBackups {
    Write-Log "Cleaning up local backups older than $RetentionDays days..."
    
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $OldBackups = Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.dump.gz" | 
        Where-Object { $_.LastWriteTime -lt $CutoffDate }
    
    $DeletedCount = 0
    foreach ($File in $OldBackups) {
        Remove-Item $File.FullName -Force
        $DeletedCount++
    }
    
    Write-Log "Deleted $DeletedCount old backup(s)"
    
    # Cleanup old log files
    Get-ChildItem -Path $BackupDir -Filter "backup_*.log" | 
        Where-Object { $_.LastWriteTime -lt $CutoffDate } | 
        Remove-Item -Force
}

function Send-Metrics {
    param([string]$FilePath, [string]$Checksum)
    
    Write-Log "Sending backup metrics..."
    
    try {
        $FileSize = (Get-Item $FilePath).Length
        
        $Body = @{
            status = "success"
            size = $FileSize
            timestamp = $Timestamp
            database = $DbName
            checksum = $Checksum
        } | ConvertTo-Json
        
        Invoke-RestMethod -Method POST -Uri "http://localhost:3000/metrics/backup" `
            -ContentType "application/json" -Body $Body -ErrorAction SilentlyContinue
    } catch {
        Write-Log "WARNING: Failed to send metrics: $_"
    }
}

# Main execution
try {
    Write-Log "========================================"
    Write-Log "PostgreSQL Backup Started"
    Write-Log "Database: $DbName"
    Write-Log "Host: ${DbHost}:${DbPort}"
    Write-Log "========================================"
    
    Test-Prerequisites
    New-BackupDirectory
    Invoke-Backup
    $Checksum = Test-Backup
    $CompressedFile = Compress-Backup
    Send-ToCloud -FilePath $CompressedFile
    New-MonthlyBackup -FilePath $CompressedFile
    Remove-OldBackups
    Send-Metrics -FilePath $CompressedFile -Checksum $Checksum
    
    Write-Log "========================================"
    Write-Log "Backup completed successfully"
    Write-Log "Backup file: $CompressedFile"
    Write-Log "========================================"
    
} catch {
    Exit-WithError "Unexpected error: $_"
}
