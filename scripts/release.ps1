. "$env:RUN_DIR/scripts/_common.ps1"

$version = node -p "require('./package.json').version"

Write-Output $version

gh release create $version --title "Robyottoko $version" --generate-notes
