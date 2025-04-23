Write-Host "=== Running Backend Tests ===" -ForegroundColor Green
Set-Location -Path ".\clothing-store-backend"
python -m unittest discover tests

Write-Host ""
Write-Host "=== Running Frontend Tests ===" -ForegroundColor Green
Set-Location -Path "..\clothing-store-frontend"
npm test -- --no-watch --no-progress --browsers=ChromeHeadless

Write-Host ""
Write-Host "All tests completed!" -ForegroundColor Green

Set-Location -Path ".." 