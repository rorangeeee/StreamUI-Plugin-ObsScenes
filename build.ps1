param([Parameter(Mandatory=$true)][string]$SdkPath)
$ErrorActionPreference = 'Stop'
$pluginRoot = $PSScriptRoot
$sdkRoot = [IO.Path]::GetFullPath($SdkPath)
$sdkFile = Join-Path $sdkRoot 'StreamUI.Contracts.dll'
if (-not (Test-Path -LiteralPath $sdkFile)) { throw 'Build the Core SDK first: npm run sdk:build. Then pass its sdk/native directory.' }
$sdkAssembly = [Reflection.AssemblyName]::GetAssemblyName($sdkFile)
if ($sdkAssembly.Name -ne 'StreamUI.Contracts' -or $sdkAssembly.Version.Major -ne 1) { throw 'This plugin requires StreamUI Contracts SDK major version 1.' }
& dotnet build (Join-Path $pluginRoot 'ObsScenes.csproj') -c Release --configfile (Join-Path $pluginRoot 'NuGet.Config') ('-p:StreamUISdkPath=' + $sdkRoot)
if ($LASTEXITCODE -ne 0) { throw 'Plugin build failed.' }
foreach ($extension in @('.dll','.deps.json')) { Copy-Item -LiteralPath (Join-Path $pluginRoot ('bin/Release/net10.0-windows/ObsScenes' + $extension)) -Destination $pluginRoot -Force }
Write-Output 'Plugin built. Place this folder under Core/plugins/obs-scenes before starting Core.'
