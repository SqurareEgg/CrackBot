# CrackBot 자율주행 균열 스캔 (독립 모듈)

Lamp AI 메카넘 자동차 + NCAM 카메라로 전진 주행하며 실시간으로 균열을 탐지하고,
발견 시 자동 정지·사진 저장까지 하는 독립 실행 스크립트입니다. 모델 가중치까지
이 폴더 안에 복제되어 있어 `backend/`, `frontend/` 없이 이 폴더만으로 완전히
동작합니다. 서버 업로드는 아직 범위에 없습니다 (로컬에만 저장).

## 준비

```sh
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

`drive_scan.py` 상단의 설정값을 환경에 맞게 수정하세요:

- `PORT` — 자동차 시리얼 포트 (블루투스 COM5 / USB COM4 등)
- `CAMERA_INDEX` — NCAM 동글이 잡히는 웹캠 인덱스 (0부터 순서대로 시도)
- `DRIVE_SPEED`, `CONF_THRESHOLD`, `INFER_INTERVAL` — 주행 속도 / 탐지 민감도 / 추론 주기

모델 가중치는 `model/crack_best.pt`에 복제되어 있습니다 (`backend/app/ml/crack_best.pt`와 동일 파일, 독립 폴더 구성을 위해 복사).

## 실행

```sh
python drive_scan.py
```

하드웨어(차량) 없이 카메라+탐지 파이프라인만 테스트하려면:

```sh
python drive_scan.py --dry-run
```

## 조작

미리보기 창("CrackBot Autonomous Scan")에 포커스가 있어야 키 입력이 인식됩니다.

| 키 | 동작 |
|---|---|
| `G` | 출발 (전진 시작) |
| `SPACE` | 긴급 정지 |
| `ESC` | 종료 (모터 정지 후 연결 해제) |

## 동작 방식

1. `G`를 누르면 전진하며 약 5fps(`INFER_INTERVAL=0.2s`)로 YOLO 추론을 돌립니다.
2. `CONF_THRESHOLD` 이상인 탐지가 하나라도 나오면 즉시 정지하고, 중앙 LED(핀 3)를 켜고,
   원본/탐지결과 오버레이 이미지 두 장을 `captures/`에 타임스탬프 파일명으로 저장합니다.
3. 정지 후에는 `G`를 다시 눌러야 재출발합니다 (자동 재출발 안 함) — `G`를 누르면 중앙
   LED가 꺼지고 다시 전진합니다. LED가 꺼져있으면 주행 중, 켜져있으면 탐지로 정지한
   상태라는 뜻입니다.
4. 스크립트가 어떻게 종료되든(정상/예외/Ctrl+C) `finally`에서 모터와 LED를 모두 끕니다.

## 웹 조작 패널 (web_control.py)

키보드 대신 브라우저로 조작하고 싶으면 `drive_scan.py` 대신 이걸 실행하세요 (둘은 독립적인
진입점이라 동시에 같은 COM 포트/카메라를 켜면 충돌하니 하나만 실행합니다).

```sh
python web_control.py
```

콘솔에 뜨는 `http://localhost:8800`을 브라우저로 열면 조작 패널이 나옵니다. 차량 PC와
같은 Wi-Fi에 있는 다른 기기(폰 등)에서는 `http://<PC의 IP>:8800`으로 접속할 수 있습니다.

**UI 구성**: 실시간 캠 화면(탐지 on일 때 바운딩박스 오버레이) / 전진·후진·좌·우·정지
방향패드 / 속도 슬라이더 / 각도(서보) 슬라이더 / 실시간 탐지 on-off 스위치 / 종료 버튼.

- 방향 버튼은 클릭하면 그 방향으로 계속 주행(정지 버튼 전까지 유지) — `drive_scan.py`의
  G/SPACE와 같은 방식입니다.
- "실시간 탐지"가 켜져 있고 주행 중일 때 균열이 탐지되면 자동으로 정지하고 중앙 LED가
  켜지며, `captures/`에 사진이 저장됩니다. 다시 방향 버튼을 누르면 LED가 꺼지고 재출발합니다.
- 각도 슬라이더는 `SERVO_PIN`(기본값 3) 서보를 제어합니다 — 실제 각도 서보가 연결된 핀이
  다르면 `web_control.py` 상단의 `SERVO_PIN` 값을 바꿔주세요.
- 종료 버튼을 누르면 모터·LED를 끄고 서버 프로세스까지 정상 종료합니다.

## 다음 단계 (아직 미구현)

- 저장된 사진을 CrackBot 백엔드(`/v1/photos/detect` 등)로 업로드해 프로젝트/구역에 연결
- 조향/주행 경로를 이용한 실제 자율주행 경로 추적 — 지금은 수동 방향 지정만 지원
- `web_control.py`의 각도 서보 핀(`SERVO_PIN`) 실제 배선 확인
