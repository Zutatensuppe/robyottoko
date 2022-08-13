. "$env:RUN_DIR/scripts/_common.ps1"

Set-Location $env:RUN_DIR

Remove-Item -Recurse -Force build/*

# server build
npx rollup -c rollup.server.config.js
ThrowOnNativeFailure

cp -r src/templates build/server/
ThrowOnNativeFailure

cp -r src/config_data build/server/
ThrowOnNativeFailure

# frontend build
# npx vue-tsc --noEmit
npx vite build --config vite.config.js
ThrowOnNativeFailure

# widgets build
npx vite build --config widget.vite.config.js
ThrowOnNativeFailure
