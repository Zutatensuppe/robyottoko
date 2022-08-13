. "$env:RUN_DIR/scripts/_common.ps1"

Set-Location $env:RUN_DIR

npm ci
ThrowOnNativeFailure
