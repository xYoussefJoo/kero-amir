<#
.SYNOPSIS
  Deploys the API to MonsterASP.NET (IIS + SQL Server) with Web Deploy.

.DESCRIPTION
  1. Applies EF Core migrations to the production database (from this machine).
  2. Seeds the owner account and initial content (from this machine), so the owner password never lives on the server.
  3. Publishes the API (Release) and writes only ConnectionStrings__Sql and Jwt__SigningKey into the server's web.config.
  4. Uploads with msdeploy (app goes offline during the copy), then checks /api/v1/health/ready.

  Secrets come from deploy/production.secrets.json (git-ignored; copy production.secrets.example.json).
  The Web Deploy password comes from the .publishSettings file. Nothing secret is printed.

.EXAMPLE
  ./deploy/deploy.ps1 -PublishSettings "D:\New_Downloads\kero-amir.runasp.net-WebDeploy.publishSettings"
#>
param(
    [Parameter(Mandatory)] [string] $PublishSettings,
    [string] $SecretsFile = (Join-Path $PSScriptRoot 'production.secrets.json'),
    [switch] $SkipDatabase,
    [switch] $SelfContained
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$api = Join-Path $root 'apps/api'
$out = Join-Path $PSScriptRoot 'out'
$msdeploy = 'C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe'

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# ---- Secrets
if (-not (Test-Path $SecretsFile)) {
    throw "Missing $SecretsFile. Copy production.secrets.example.json to production.secrets.json and fill it in."
}
$secrets = Get-Content $SecretsFile -Raw | ConvertFrom-Json
if ($secrets.connectionString -match 'PUT-YOUR-DB-PASSWORD-HERE') { throw 'Fill in the database password in production.secrets.json.' }
if ([string]::IsNullOrWhiteSpace($secrets.jwtSigningKey)) {
    # Generated once and saved, so tokens stay valid across deploys.
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secrets.jwtSigningKey = [Convert]::ToBase64String($bytes)
    $secrets | ConvertTo-Json | Set-Content $SecretsFile -Encoding UTF8
    Write-Host 'Generated a JWT signing key and saved it to the secrets file.'
}

[xml] $profileXml = Get-Content $PublishSettings
$profile = $profileXml.publishData.publishProfile | Where-Object { $_.publishMethod -eq 'MSDeploy' } | Select-Object -First 1
if (-not $profile) { throw 'No MSDeploy profile in the publish settings file.' }

# Environment for the local migration + seed steps (this process only).
$env:ASPNETCORE_ENVIRONMENT = 'Production'
$env:ConnectionStrings__Sql = $secrets.connectionString
$env:Jwt__SigningKey = $secrets.jwtSigningKey

try {
    if (-not $SkipDatabase) {
        Step 'Applying database migrations'
        dotnet ef database update -p "$api/src/KeroAmir.Infrastructure" -s "$api/src/KeroAmir.Api" --connection $secrets.connectionString
        if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }

        Step 'Seeding owner account and initial content'
        $env:Seed__OwnerEmail = $secrets.ownerEmail
        $env:Seed__OwnerPassword = $secrets.ownerPassword
        $env:Seed__Content = 'true'
        dotnet run --project "$api/src/KeroAmir.Api" -c Release --no-launch-profile -- --seed-and-exit
        if ($LASTEXITCODE -ne 0) { throw 'Seeding failed.' }
    }

    Step 'Publishing the API'
    if (Test-Path $out) { Remove-Item $out -Recurse -Force }
    # win-x64 only: MonsterASP runs Windows/IIS, and other runtimes' native SqlClient files add ~60 MB.
    $publishArgs = @("$api/src/KeroAmir.Api", '-c', 'Release', '-o', $out, '-r', 'win-x64', '--self-contained', $SelfContained.IsPresent.ToString().ToLower())
    dotnet publish @publishArgs
    if ($LASTEXITCODE -ne 0) { throw 'Publish failed.' }

    Step 'Writing server environment into web.config'
    $webConfigPath = Join-Path $out 'web.config'
    [xml] $webConfig = Get-Content $webConfigPath
    $aspNetCore = $webConfig.SelectSingleNode('//aspNetCore')
    $envVars = $webConfig.CreateElement('environmentVariables')
    foreach ($pair in @(
            @('ASPNETCORE_ENVIRONMENT', 'Production'),
            @('ConnectionStrings__Sql', $secrets.connectionString),
            @('Jwt__SigningKey', $secrets.jwtSigningKey))) {
        $var = $webConfig.CreateElement('environmentVariable')
        $var.SetAttribute('name', $pair[0])
        $var.SetAttribute('value', $pair[1])
        [void] $envVars.AppendChild($var)
    }
    [void] $aspNetCore.AppendChild($envVars)
    $webConfig.Save($webConfigPath)

    Step "Uploading to $($profile.destinationAppUrl)"
    $dest = "contentPath=$($profile.msdeploySite),computerName=https://$($profile.publishUrl):8172/msdeploy.axd?site=$($profile.msdeploySite)," +
            "userName=$($profile.userName),password=$($profile.userPWD),authType=Basic"
    & $msdeploy -verb:sync "-source:contentPath=$out" "-dest:$dest" -allowUntrusted -enableRule:AppOffline -retryAttempts:3
    if ($LASTEXITCODE -ne 0) { throw 'Upload failed.' }

    Step 'Checking the live API'
    $url = ($profile.destinationAppUrl.TrimEnd('/')) + '/api/v1/health/ready'
    Start-Sleep -Seconds 5
    $response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 60
    Write-Host "$url -> $($response.StatusCode) $($response.Content)" -ForegroundColor Green
}
finally {
    # Server secrets are in the published web.config; don't leave them on disk.
    if (Test-Path $out) { Remove-Item $out -Recurse -Force }
    foreach ($name in 'ConnectionStrings__Sql', 'Jwt__SigningKey', 'Seed__OwnerEmail', 'Seed__OwnerPassword', 'Seed__Content') {
        Remove-Item "Env:$name" -ErrorAction SilentlyContinue
    }
}
