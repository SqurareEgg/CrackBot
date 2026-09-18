# CrackBot 개발 서버 시작 스크립트
# 사용법: .\start.ps1

# Windows Store Python 3.13 user site-packages (ultralytics, cv2 등)
$env:PYTHONPATH = "C:\Users\kjw52\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages"

# 기존 8000 포트 프로세스 정리
Get-Process -Name "python*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 백엔드 시작 (포트 8000)
Write-Host "백엔드 시작 중..." -ForegroundColor Cyan
$backend = Start-Process -FilePath "py" `
  -ArgumentList "-3.13", "-m", "uvicorn", "app.main:app", "--port", "8000", "--host", "0.0.0.0", "--reload" `
  -WorkingDirectory "$PSScriptRoot\backend" `
  -PassThru
Write-Host "백엔드 PID: $($backend.Id)" -ForegroundColor Green

Start-Sleep -Seconds 2

# 프론트엔드 시작 (포트 5173)
Write-Host "프론트엔드 시작 중..." -ForegroundColor Cyan
$frontend = Start-Process -FilePath "npm" `
  -ArgumentList "run", "dev" `
  -WorkingDirectory "$PSScriptRoot\frontend" `
  -PassThru
Write-Host "프론트엔드 PID: $($frontend.Id)" -ForegroundColor Green

Write-Host ""
Write-Host "서버 준비 완료!" -ForegroundColor Yellow
Write-Host "  백엔드: http://localhost:8000" -ForegroundColor White
Write-Host "  프론트엔드: http://localhost:5173" -ForegroundColor White
Write-Host "  로그인: admin@crackbot.ai / crackbot123" -ForegroundColor White
