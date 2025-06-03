Remove-Item -Recurse -Force dist/ -ErrorAction SilentlyContinue

npm run build

if ($LASTEXITCODE -eq 0) {
    Copy-Item manifest.json dist/
    Copy-Item src/content.js dist/
    Copy-Item public/threadlink-icon.png dist/
    Copy-Item public/refresh-icon.png dist/
    # Copy assets folder if it exists
    if (Test-Path "src/assets") {
        Copy-Item -Recurse -Force src/assets dist/
    }
    Write-Host "Build completed successfully"
} else {
    Write-Host "Build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}