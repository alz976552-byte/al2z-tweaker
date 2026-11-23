$ErrorActionPreference = 'Stop'
$dir = Join-Path (Get-Location) 'node_modules\7zip-bin\win\x64'
$real = Join-Path $dir '7za-real.exe'
$target = Join-Path $dir '7za.exe'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { Write-Warning 'csc.exe not found; skipping 7-Zip symlink workaround'; exit 0 }
if (-not (Test-Path $real) -and (Test-Path $target)) { Move-Item $target $real }
if (-not (Test-Path (Join-Path (Get-Location) 'tools\7za-wrapper.cs'))) { Write-Warning 'Wrapper source missing'; exit 0 }
& $csc /nologo /out:$target /target:exe (Join-Path (Get-Location) 'tools\7za-wrapper.cs') | Out-Null
if (Test-Path $target) { Write-Host '7-Zip wrapper installed (symlink-safe).' }
