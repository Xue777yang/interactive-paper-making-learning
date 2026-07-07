param(
  [ValidateSet('dev', 'dev:stable', 'client', 'server', 'build')]
  [string]$Script = 'dev:stable'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$nodeBin = Join-Path $runtimeRoot 'node\bin'
$toolBin = Join-Path $runtimeRoot 'bin'
$pnpm = Join-Path $toolBin 'pnpm.cmd'

if ((Test-Path $nodeBin) -and (Test-Path $pnpm)) {
  $env:PATH = "$nodeBin;$toolBin;$env:PATH"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js was not found on PATH. Install Node.js or run this inside Codex with the bundled runtime available."
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm was not found on PATH. Install pnpm or run this inside Codex with the bundled runtime available."
}

Set-Location $repoRoot
pnpm run $Script
