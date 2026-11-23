/* Windows backend for Al2zTweaker — UWP and Win32 operations via PowerShell */
const { spawnSync } = require('child_process');

// Common removable Microsoft Store apps. System-critical runtime packages are not included.
const BLOATWARE_NAMES = [
  'microsoft.windowscommunicationsapps',
  'microsoft.outlookforwindows',
  'microsoft.windowsfeedbackhub',
  'microsoft.xboxapp',
  'microsoft.xboxgameoverlay',
  'microsoft.xboxgamingoverlay',
  'microsoft.xboxidentityprovider',
  'microsoft.xboxspeechtotextoverlay',
  'microsoft.xbox.tcui',
  'microsoft.gamingapp',
  'microsoft.clipchamp',
  'microsoft.copilot',
  'microsoft.bingnews',
  'microsoft.bingweather',
  'microsoft.bingsports',
  'microsoft.getstarted',
  'microsoft.microsoftsolitairecollection',
  'microsoft.windowsmaps',
  'microsoft.zonemusic',
  'microsoft.zonevideo',
  'microsoft.people',
  'microsoft.yourphone',
  'microsoft.todos',
  'microsoft.microsoftofficehub',
  'microsoft.skypeapp',
  'microsoft.wallet',
  'microsoft.microsoft3dviewer',
  'microsoft.microsoftpaint3d'
];

class WindowsUtils {
  constructor() {
    this.isWindows = process.platform === 'win32';
  }

  runPowerShell(command) {
    if (!this.isWindows) throw new Error('This utility works only on Windows');

    const result = spawnSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command
    ], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 30000 });

    if (result.error) return { success: false, error: result.error.message, output: '' };
    const output = (result.stdout || '').trim();
    if (result.status === 0) return { success: true, output };

    return {
      success: false,
      output,
      error: (result.stderr || '').trim() || `PowerShell exited with code ${result.status}`
    };
  }

  getUwpApps() {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $apps = Get-AppxPackage -AllUsers
      if (-not $apps) { $apps = Get-AppxPackage }
      $apps |
        Select-Object Name, PackageFullName, Publisher, Version, InstallLocation |
        Where-Object { $_.Name -notmatch 'Microsoft.WindowsStore|ShellExperienceHost|Windows.Explorer|Microsoft.AAD.BrokerPlugin|Microsoft.Windows.SecHealthUI|Microsoft.Windows.Search|Microsoft.Windows.StartMenuExperienceHost|Microsoft.UI.Xaml|Microsoft.NET.Native|Microsoft.VCLibs|Microsoft.WinJS' } |
        Sort-Object Name |
        ConvertTo-Json -Depth 3
    `;
    const result = this.runPowerShell(command);
    if (result.success && result.output) {
      try {
        const parsed = JSON.parse(result.output);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (_) { return []; }
    }
    return [];
  }

  removeUwpApp(packageFullName) {
    if (!packageFullName) return { success: false, error: 'No package specified' };
    const command = `Remove-AppxPackage -Package '${packageFullName}' -ErrorAction Stop; 'OK'`;
    const result = this.runPowerShell(command);
    return result.success && result.output.includes('OK')
      ? { success: true, output: result.output }
      : { success: false, error: result.error || 'Remove-AppxPackage failed', output: result.output };
  }

  removeUwpAppForAll(packageFullName) {
    if (!packageFullName) return { success: false, error: 'No package specified' };
    const command = `Get-AppxPackage -AllUsers | Where-Object { $_.PackageFullName -eq '${packageFullName}' } | Remove-AppxPackage -AllUsers -ErrorAction Stop; 'OK'`;
    const result = this.runPowerShell(command);
    return result.success && result.output.includes('OK')
      ? { success: true, output: result.output }
      : { success: false, error: result.error || 'Remove-AppxPackage -AllUsers failed', output: result.output };
  }

  // Removes a curated list of bloatware including Outlook, Feedback Hub, Xbox, Copilot and others.
  removeBloatware() {
    const names = BLOATWARE_NAMES.map((n) => `'${n}'`).join(', ');
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $names = @(${names})
      $apps = Get-AppxPackage -AllUsers | Where-Object { $names -contains $_.Name.ToLower() }
      if (-not $apps) { $apps = Get-AppxPackage | Where-Object { $names -contains $_.Name.ToLower() } }
      $removed = @()
      $failed = @()
      foreach ($app in $apps) {
        try {
          Remove-AppxPackage -Package $app.PackageFullName -AllUsers -ErrorAction Stop
          $removed += $app.Name
        } catch {
          try {
            Remove-AppxPackage -Package $app.PackageFullName -ErrorAction Stop
            $removed += $app.Name
          } catch {
            $failed += ($app.Name + ': ' + $_.Exception.Message)
          }
        }
      }
      [pscustomobject]@{ removed = $removed; failed = $failed; total = @($apps).Count } | ConvertTo-Json -Depth 3
    `;
    const result = this.runPowerShell(command);
    if (!result.success || !result.output) {
      return { success: false, removed: [], failed: [result.error || 'PowerShell failed'], total: 0 };
    }
    try {
      const parsed = JSON.parse(result.output);
      const asArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);
      return {
        success: true,
        removed: asArray(parsed.removed),
        failed: asArray(parsed.failed),
        total: Number(parsed.total) || 0
      };
    } catch (_) {
      return { success: false, removed: [], failed: ['Could not parse result'], total: 0 };
    }
  }

  getInstalledPrograms() {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $paths = @(
        'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
        'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
        'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
      )
      $items = foreach ($p in $paths) { Get-ItemProperty $p }
      $items |
        Where-Object { $_.DisplayName -and $_.DisplayName.Trim() -ne '' } |
        Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, InstallLocation, UninstallString |
        Sort-Object DisplayName -Unique |
        ConvertTo-Json -Depth 3
    `;
    const result = this.runPowerShell(command);
    if (result.success && result.output) {
      try {
        const parsed = JSON.parse(result.output);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (_) { return []; }
    }
    return [];
  }

  uninstallWin32Program(uninstallString) {
    if (!uninstallString) return { success: false, error: 'No uninstall string' };

    // cmd.exe correctly handles quoted paths such as "C:\Program Files\App\uninst.exe"
    const result = spawnSync('cmd.exe', ['/d', '/c', uninstallString], {
      encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024
    });

    if (result.error) return { success: false, error: result.error.message };
    return {
      success: result.status === 0,
      output: (result.stdout || '').trim(),
      error: result.status === 0 ? undefined : (result.stderr || '').trim() || `Uninstaller exited with code ${result.status}`
    };
  }

  getSystemInfo() {
    const command = `
      $os = Get-CimInstance Win32_OperatingSystem
      $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
      $ram = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
      @{
        OS = $os.Caption
        Version = $os.Version
        BuildNumber = $os.BuildNumber
        Architecture = $os.OSArchitecture
        CPU = $cpu.Name
        Cores = $cpu.NumberOfCores
        LogicalProcessors = $cpu.NumberOfLogicalProcessors
        RAM_GB = [math]::Round($ram.Sum / 1GB, 2)
        SystemDrive = $env:SystemDrive
        User = $env:USERNAME
      } | ConvertTo-Json
    `;
    const result = this.runPowerShell(command);
    if (result.success && result.output) {
      try { return JSON.parse(result.output); } catch (_) { return {}; }
    }
    return {};
  }

  createRestorePoint(description = 'Al2zTweaker backup') {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      Enable-ComputerRestore -Drive "$env:SystemDrive"
      $point = Checkpoint-Computer -Description '${description}' -RestorePointType MODIFY_SETTINGS
      if ($point) { 'Success' } else { 'Failed' }
    `;
    const result = this.runPowerShell(command);
    return {
      success: result.success && result.output.includes('Success'),
      output: result.output,
      error: result.success ? undefined : result.error
    };
  }

  restartExplorer() {
    const command = `Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Process explorer; 'OK'`;
    const result = this.runPowerShell(command);
    return { success: result.success, output: result.output, error: result.error };
  }

  getActivationStatus() {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $lic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey is not null" |
        Where-Object { $_.Name -like 'Windows*Operating System*' -or $_.Name -like 'Windows(R)*' } |
        Select-Object -First 1
      $xpr = cscript //nologo "$env:windir\\system32\\slmgr.vbs" /xpr 2>&1
      [pscustomobject]@{
        activated = [bool]($lic -and $lic.LicenseStatus -eq 1)
        status = if ($lic) { [string]$lic.LicenseStatus } else { 'Unknown' }
        name = if ($lic) { [string]$lic.Name } else { 'Windows' }
        partialKey = if ($lic) { [string]$lic.PartialProductKey } else { '' }
        expiration = (@($xpr) -join ' ').Trim()
      } | ConvertTo-Json -Compress
    `;
    const result = this.runPowerShell(command);
    if (result.success && result.output) {
      try { return JSON.parse(result.output); } catch (_) { /* fall through */ }
    }
    return { activated: false, status: 'Unknown', name: 'Windows', partialKey: '', expiration: '' };
  }

  openSettings(page) {
    const allowed = ['activation', 'troubleshoot', 'windowsupdate', 'windowsupdate-action', 'recovery', 'personalization', 'privacy', 'appsfeatures', 'system', 'power'];
    if (!allowed.includes(page)) return { success: false, error: 'Unknown settings page' };
    const result = spawnSync('cmd.exe', ['/d', '/c', 'start', '', `ms-settings:${page}`], {
      encoding: 'utf8', windowsHide: true
    });
    return { success: !result.error && result.status === 0, error: result.error?.message };
  }

  getUpdateStatus() {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $hotfix = Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1
      $key = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate'
      $last = (Get-ItemProperty $key -ErrorAction SilentlyContinue).LastSuccessTime
      [pscustomobject]@{
        lastUpdate = if ($hotfix) { [string]$hotfix.InstalledOn } else { '' }
        hotfixId = if ($hotfix) { [string]$hotfix.HotFixID } else { '' }
        lastScan = [string]$last
      } | ConvertTo-Json -Compress
    `;
    const result = this.runPowerShell(command);
    if (result.success && result.output) {
      try { return JSON.parse(result.output); } catch (_) { /* fall through */ }
    }
    return { lastUpdate: '', hotfixId: '', lastScan: '' };
  }

  quickSetup() {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $done = @()
      try {
        Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name AppsUseLightTheme -Value 0 -Type DWord
        Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' -Name SystemUsesLightTheme -Value 0 -Type DWord
        $done += 'Dark mode'
      } catch {}
      try {
        Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name HideFileExt -Value 0 -Type DWord
        $done += 'File extensions'
      } catch {}
      try {
        Set-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name Hidden -Value 1 -Type DWord
        $done += 'Hidden files'
      } catch {}
      try {
        $policy = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy'
        if (-not (Test-Path $policy)) { New-Item -Path $policy -Force | Out-Null }
        Set-ItemProperty $policy -Name '01' -Value 1 -Type DWord
        $done += 'Storage Sense'
      } catch {}
      try {
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 | Out-Null
        $done += 'High performance'
      } catch {}
      [pscustomobject]@{ success = $true; applied = $done } | ConvertTo-Json -Compress
    `;
    const result = this.runPowerShell(command);
    if (result.success && result.output) {
      try { return JSON.parse(result.output); } catch (_) { /* fall through */ }
    }
    return { success: false, applied: [] };
  }

  pauseUpdates(days = 7) {
    const daysVal = Math.min(35, Math.max(1, Number(days) || 7));
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $key = 'HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings'
      if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
      $until = (Get-Date).AddDays(${daysVal}).ToString('yyyy-MM-ddTHH:mm:ssZ')
      Set-ItemProperty $key -Name PauseUpdatesExpiryTime -Value $until -Type String
      'OK'
    `;
    const result = this.runPowerShell(command);
    return { success: result.success && result.output.includes('OK'), error: result.error };
  }

  resumeUpdates() {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $key = 'HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings'
      Remove-ItemProperty $key -Name PauseUpdatesExpiryTime -ErrorAction SilentlyContinue
      'OK'
    `;
    const result = this.runPowerShell(command);
    return { success: result.success && result.output.includes('OK'), error: result.error };
  }

  getRestorePoints() {
    const command = `
      $ErrorActionPreference = 'SilentlyContinue'
      $points = Get-ComputerRestorePoint | Sort-Object SequenceNumber -Descending | Select-Object -First 8
      if ($points) {
        $points | Select-Object SequenceNumber, Description, @{n='Date';e={$_.CreationTime.ToString('yyyy-MM-dd HH:mm')}} | ConvertTo-Json -Compress
      } else { '[]' }
    `;
    const result = this.runPowerShell(command);
    if (result.success && result.output) {
      try {
        const parsed = JSON.parse(result.output);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (_) { return []; }
    }
    return [];
  }

  openTool(name) {
    const commands = {
      systemRestore: 'rstrui.exe',
      diskCleanup: 'cleanmgr.exe',
      advancedStartup: 'shutdown.exe /r /o /t 10',
      commandPrompt: 'cmd.exe'
    };
    const exe = commands[name];
    if (!exe) return { success: false, error: 'Unknown tool' };
    const result = spawnSync('cmd.exe', ['/d', '/c', 'start', '', exe], {
      encoding: 'utf8', windowsHide: true
    });
    return { success: !result.error && result.status === 0, error: result.error?.message };
  }

  isAdmin() {
    const command = `
      $p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
      if ($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { 'True' } else { 'False' }
    `;
    const result = this.runPowerShell(command);
    return result.success && result.output.trim() === 'True';
  }
}

module.exports = new WindowsUtils();
