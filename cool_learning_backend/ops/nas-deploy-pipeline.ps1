# ==============================================================================
# Cool Learning - NAS Deploy Pipeline
# ==============================================================================
param(
    [string]$NasHost = $(if ($env:NAS_HOST) { $env:NAS_HOST } else { "192.168.173.200" }),
    [string]$NasUser = $(if ($env:NAS_USER) { $env:NAS_USER } else { "ryantwn" }),
    [int]$NasPort = 22,
    [string]$NasDeployPath = "/volume1/docker/cool_learning_backend",
    [string]$HealthUrl = "https://learning.ifit.myds.me:4061/api/health",
    [switch]$SkipPush,
    [switch]$SkipCiWait
)

$ErrorActionPreference = "Continue"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "[INFO] Cool Learning NAS Deploy Pipeline Started" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$currentCommit = (git rev-parse HEAD).Trim()
$shortCommit = $currentCommit.Substring(0, 7)
Write-Host ("[TARGET] Commit: " + $currentCommit + " (" + $shortCommit + ")") -ForegroundColor Yellow

if (-not $SkipPush) {
    Write-Host "[STEP 1] Checking remote branch and pushing..." -ForegroundColor Cyan
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[ERROR] git push failed. Please check credentials or branch conflicts."
        exit 1
    }
}

if (-not $SkipCiWait) {
    Write-Host "[STEP 2] Waiting for GitHub Actions CI/CD to build and push containers..." -ForegroundColor Cyan
    $ciDone = $false
    $timeoutSeconds = 1200
    $startTime = Get-Date

    while (-not $ciDone) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        if ($elapsed -gt $timeoutSeconds) {
            Write-Error "[ERROR] Timeout waiting for GitHub Actions (exceeded 10 minutes)."
            exit 1
        }

        $runJsonStr = gh run list --commit $currentCommit --limit 1 --json status,conclusion,databaseId 2>$null
        if ($runJsonStr) {
            $runs = $runJsonStr | ConvertFrom-Json
            if ($runs -and $runs.Count -gt 0) {
                $st = $runs[0].status
                $cc = $runs[0].conclusion
                $rid = $runs[0].databaseId

                if ($st -eq "completed") {
                    if ($cc -eq "success") {
                        Write-Host ("[SUCCESS] GitHub Actions workflow completed! (Run ID: " + $rid + ")") -ForegroundColor Green
                        $ciDone = $true
                        break
                    } else {
                        Write-Error ("[ERROR] GitHub Actions workflow failed (conclusion: " + $cc + ", Run ID: " + $rid + ")")
                        exit 1
                    }
                } else {
                    $sec = [Math]::Round($elapsed)
                    Write-Host ("  ... CI/CD in progress (status: " + $st + ", elapsed: " + $sec + "s) ...") -ForegroundColor Gray
                }
            }
        }
        Start-Sleep -Seconds 10
    }
}

Write-Host ("[STEP 3] Triggering NAS pull via SSH (" + $NasUser + "@" + $NasHost + ":" + $NasPort + ")...") -ForegroundColor Cyan
$remoteCmd = "sudo " + $NasDeployPath + "/deploy-nas.sh"
Write-Host ("Executing: ssh -p " + $NasPort + " " + $NasUser + "@" + $NasHost + " " + $remoteCmd) -ForegroundColor Gray

$sshOutput = ssh -p $NasPort -o BatchMode=yes -o StrictHostKeyChecking=accept-new ($NasUser + "@" + $NasHost) $remoteCmd 2>&1
$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
    Write-Host "[SUCCESS] NAS deploy-nas.sh executed successfully!" -ForegroundColor Green
    Write-Host $sshOutput
} else {
    Write-Warning ("[WARN] SSH call failed (Exit Code: " + $exitCode + ")")
    Write-Host $sshOutput -ForegroundColor Yellow
    Write-Host "[NOTICE] If SSH key is not yet configured, please add your public key (~/.ssh/id_ed25519.pub) to ~/.ssh/authorized_keys on the NAS." -ForegroundColor Yellow
}

Write-Host ("[STEP 4] Verifying production health endpoint (" + $HealthUrl + ")...") -ForegroundColor Cyan
$verified = $false
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 4
    try {
        $res = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 5
        if ($res -and $res.status -eq "ok") {
            $liveVer = $res.version
            if ($liveVer.StartsWith($shortCommit) -or $liveVer -eq $currentCommit) {
                Write-Host ("[SUCCESS] Deployment verified! Production is running " + $liveVer) -ForegroundColor Green
                Write-Host ("Database status: " + $res.database) -ForegroundColor Green
                $verified = $true
                break
            } else {
                Write-Host ("  ... Live version is " + $liveVer + ", waiting for container to refresh (attempt " + $i + "/15) ...") -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host ("  ... Container restarting, waiting (attempt " + $i + "/15) ...") -ForegroundColor Gray
    }
}

if (-not $verified) {
    Write-Warning "[WARN] Live endpoint did not switch within the expected time window."
}
