$ErrorActionPreference = 'Stop'
$cache = Join-Path $env:LOCALAPPDATA 'electron\Cache'
$zip = Get-ChildItem $cache -Recurse -Filter 'electron-v*-win32-x64.zip' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $zip) { Write-Error 'No cached Electron archive found'; exit 1 }
Write-Host "Using cached archive: $zip"
Remove-Item -Recurse -Force node_modules\electron\dist -ErrorAction SilentlyContinue
Expand-Archive -Path $zip -DestinationPath node_modules\electron\dist -Force
Set-Content -Path node_modules\electron\path.txt -Value 'electron.exe' -NoNewline
if (-not (Test-Path node_modules\electron\dist\electron.exe)) { Write-Error 'Extraction failed'; exit 1 }
Write-Host 'Electron binary ready.'
