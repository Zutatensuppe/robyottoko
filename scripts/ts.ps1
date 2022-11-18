. "$env:RUN_DIR/scripts/_common.ps1"

node --max-old-space-size=256 --experimental-specifier-resolution=node --loader ts-node/esm $args
ThrowOnNativeFailure
