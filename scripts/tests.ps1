. "$env:RUN_DIR/scripts/_common.ps1"

$env:APP_CONFIG="config.test.json"

node --experimental-vm-modules node_modules/jest/bin/jest.js
ThrowOnNativeFailure
