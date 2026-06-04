# push.ps1 — build, commit, push context-web to GitHub (main).
# Vercel git-integration auto-deploys on push to main. Usage: .\push.ps1 "commit message"
param([string]$Message = "update")

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==> build" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "build failed — aborting push" -ForegroundColor Red; exit 1 }

Write-Host "==> commit + push" -ForegroundColor Cyan
git add -A
git commit -m $Message
git push origin main

Write-Host "==> done. Vercel auto-deploys from main." -ForegroundColor Green
