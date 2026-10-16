$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$watchdog = Join-Path $PSScriptRoot 'keep_server_running.ps1'
$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$startup = [Environment]::GetFolderPath('Startup')
if (-not $startup) { throw 'Windows Startup folder was not found.' }

$shortcutPath = Join-Path $startup 'Hoa Tam Box Office.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershell
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start Hoa Tam game backend at Windows sign-in'
$shortcut.Save()

Start-Process -FilePath $powershell -ArgumentList $shortcut.Arguments `
    -WorkingDirectory $projectRoot -WindowStyle Hidden

Write-Output "Installed Windows Startup shortcut: $shortcutPath"
Write-Output 'Backend launch requested. Check http://localhost:4173/.'
