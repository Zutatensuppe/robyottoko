. "$env:RUN_DIR/scripts/_common.ps1"

$env:APP_CONFIG="config.test.json"

$version = node -p "require('./package.json').version"

Write-Output $version

gh release create $version --title "Robyottoko $version" --generate-notes
