# CrackBot 배포 빌드 스크립트
# NAS IP를 설정하고 실행하세요: .\build.ps1

param(
    [string]$NasIP = "192.168.0.100",   # ← NAS IP로 변경
    [string]$NasUser = "admin",          # ← NAS SSH 계정
    [string]$NasPath = "/volume1/docker/crackbot"  # ← NAS 저장 경로
)

$root = $PSScriptRoot

Write-Host "=== 1. 프론트엔드 빌드 ===" -ForegroundColor Cyan
Set-Location "$root\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "빌드 실패" -ForegroundColor Red; exit 1 }
Write-Host "프론트엔드 빌드 완료 (frontend/dist)" -ForegroundColor Green

Write-Host ""
Write-Host "=== 2. NAS 배포 방법 ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "방법 A) File Station으로 복사 (GUI):" -ForegroundColor White
Write-Host "  1. DSM → File Station → $NasPath 폴더 생성"
Write-Host "  2. 아래 파일/폴더 복사:"
Write-Host "     - backend/ (전체)"
Write-Host "     - frontend/dist/"
Write-Host "     - nginx/"
Write-Host "     - docker-compose.yml"
Write-Host ""
Write-Host "방법 B) SCP로 전송 (SSH 활성화 필요):" -ForegroundColor White
Write-Host "  ssh ${NasUser}@${NasIP} 'mkdir -p $NasPath/frontend'"
Write-Host "  scp -r backend docker-compose.yml nginx ${NasUser}@${NasIP}:$NasPath/"
Write-Host "  scp -r frontend/dist ${NasUser}@${NasIP}:$NasPath/frontend/"
Write-Host ""
Write-Host "=== 3. NAS에서 실행 ===" -ForegroundColor Yellow
Write-Host "  ssh ${NasUser}@${NasIP}"
Write-Host "  cd $NasPath"
Write-Host "  docker compose up -d --build"
Write-Host ""
Write-Host "  접속: http://${NasIP}:3000"
Write-Host ""
Write-Host "=== Container Manager GUI 방법 ===" -ForegroundColor Yellow
Write-Host "  Container Manager → 프로젝트 → 만들기"
Write-Host "  경로: $NasPath"
Write-Host "  docker-compose.yml 자동 인식"

Set-Location $root
