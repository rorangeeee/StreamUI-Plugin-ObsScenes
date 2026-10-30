param([Parameter(Mandatory=$true)][string]$SdkPath)
$ErrorActionPreference='Stop'
$pluginRoot=Split-Path -Parent $PSScriptRoot
& dotnet build (Join-Path $PSScriptRoot 'Probe\Probe.csproj') -c Release --configfile (Join-Path $pluginRoot 'NuGet.Config') ('-p:StreamUISdkPath=' + [IO.Path]::GetFullPath($SdkPath))
if ($LASTEXITCODE -ne 0) { throw 'Probe build failed.' }
Push-Location $pluginRoot
try { & node --test tests/plugin.test.mjs; if ($LASTEXITCODE -ne 0) { throw 'Plugin tests failed.' } } finally { Pop-Location }
