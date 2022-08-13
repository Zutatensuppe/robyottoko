. "$env:RUN_DIR/scripts/_common.ps1"

Set-Location $env:RUN_DIR

$env:PORT='3000'

npx vite
ThrowOnNativeFailure
