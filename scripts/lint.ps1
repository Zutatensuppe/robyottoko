. "$env:RUN_DIR/scripts/_common.ps1"

Set-Location $env:RUN_DIR

npx vue-tsc --noEmit
ThrowOnNativeFailure

npx eslint src
ThrowOnNativeFailure
