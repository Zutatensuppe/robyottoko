. "$env:RUN_DIR/scripts/_common.ps1"

$env:VITE_ENV='development'
$env:APP_CONFIG='config.json'

Set-Location $env:RUN_DIR

nodemon `
  --delay 2 `
  -x "node --experimental-specifier-resolution=node --loader ts-node/esm" `
  --max-old-space-size=256 `
  -w src `
  src/index-dev.ts `
  -e ts `
  --trace-warnings `
  --ignore public/static/ `
  --ignore src/frontend/ `
  --ignore src/frontend_widgets
ThrowOnNativeFailure
