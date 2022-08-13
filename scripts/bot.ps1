. "$env:RUN_DIR/scripts/_common.ps1"

Set-Location $env:RUN_DIR

$env:APP_CONFIG="config.json"

nodemon --watch build --max-old-space-size=256 -e js build/server/index.js
ThrowOnNativeFailure
