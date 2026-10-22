$ErrorActionPreference = 'Stop'

$disabledFlag = Join-Path $PSScriptRoot 'backend.disabled'
if (Test-Path -LiteralPath $disabledFlag) { exit 0 }

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot 'runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$node = (Get-Command node.exe -ErrorAction Stop).Source
$mutex = [System.Threading.Mutex]::new($false, 'Local\HoaTamBoxOffice4173')
$hasLock = $false

function Write-WatchdogLog([string]$message) {
    $line = "$(Get-Date -Format o) $message"
    Add-Content -LiteralPath (Join-Path $runtimeDir 'watchdog.log') -Value $line
}

function Test-PortInUse {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, 4173)
    try {
        $listener.Start()
        return $false
    } catch [System.Net.Sockets.SocketException] {
        return $true
    } finally {
        $listener.Stop()
    }
}

try {
    try {
        $hasLock = $mutex.WaitOne(0)
    } catch [System.Threading.AbandonedMutexException] {
        $hasLock = $true
    }
    if (-not $hasLock) { exit 0 }

    Write-WatchdogLog 'Watchdog started.'
    while ($true) {
        if (Test-Path -LiteralPath $disabledFlag) {
            Write-WatchdogLog 'Watchdog stopped by user request.'
            break
        }
        if (Test-PortInUse) {
            Start-Sleep -Seconds 5
            continue
        }

        try {
            $server = Start-Process -FilePath $node -ArgumentList 'backend/server.js' `
                -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
                -RedirectStandardOutput (Join-Path $runtimeDir 'server.out.log') `
                -RedirectStandardError (Join-Path $runtimeDir 'server.err.log')
            Write-WatchdogLog "Backend started, PID $($server.Id)."
            $server.WaitForExit()
            Write-WatchdogLog "Backend exited with code $($server.ExitCode). Restarting in 5 seconds."
        } catch {
            Write-WatchdogLog "Backend start failed: $($_.Exception.Message)"
        }
        Start-Sleep -Seconds 5
    }
} finally {
    if ($hasLock) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
