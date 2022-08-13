. "$env:RUN_DIR/scripts/_common.ps1"

Set-Location $env:RUN_DIR

$env:PORT="3001"

npx vite --config widget.vite.config.js
ThrowOnNativeFailure
