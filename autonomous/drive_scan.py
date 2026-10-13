# -*- coding: utf-8 -*-
"""
CrackBot 자율주행 균열 스캔 — 독립 실행 모듈 (백엔드/프론트와 무관)

흐름: G 눌러서 출발 → 전진하면서 카메라로 실시간 균열 탐지
      → 균열 발견 시 자동 정지 + 사진 저장 (autonomous/captures/)
      → 다시 G 눌러서 재출발, SPACE로 언제든 긴급정지, ESC로 종료

주의: 키 입력은 "CrackBot Autonomous Scan" 미리보기 창에 포커스가 있을 때만 인식됩니다.

실행 전 준비:
  pip install -r requirements.txt
  PORT, CAMERA_INDEX를 환경에 맞게 아래에서 수정

하드웨어 없이 비전 파이프라인만 테스트: python drive_scan.py --dry-run
"""
import argparse
import threading
import time
from datetime import datetime
from pathlib import Path

import cv2

import lamp_ai

# ── 설정 ──────────────────────────────────────────────────────────
PORT = 'COM4'            # 블루투스: COM5 / USB: COM4
BAUD = 38400
CAMERA_INDEX = 0          # NCAM 동글이 잡히는 카메라 인덱스. 안 맞으면 0,1,2... 순서로 시도

MODEL_PATH = Path(__file__).resolve().parent / 'model' / 'crack_best.pt'
CAPTURE_DIR = Path(__file__).resolve().parent / 'captures'

DRIVE_SPEED = 60          # 전진 속도 (0~100)
CONF_THRESHOLD = 0.5      # 이 신뢰도 이상인 탐지가 하나라도 있으면 정지
INFER_INTERVAL = 0.2      # YOLO 추론 주기(초). 0.2 = 약 5fps로 추론, 미리보기는 카메라 fps 그대로

FORWARD = (1, 1, 1, 1)    # (l1, r1, l2, r2) — lamp_control.py의 'w'(앞으로)와 동일
CENTER_LED_PIN = 3        # lamp_control.py LEDS 매핑: '3' = 중앙


def connect_car(port: str, baud: int, timeout: float = 10.0):
    """시리얼로 연결하고 보드에서 첫 응답 패킷이 올 때까지 대기합니다."""
    conn, reader = lamp_ai.open(port, baud)
    got = threading.Event()
    orig = reader.handle_packet

    def hook(pkt):
        got.set()
        orig(pkt)

    reader.handle_packet = hook
    print('자동차 연결 대기 중...')
    if not got.wait(timeout):
        conn.close()
        raise RuntimeError(f'{timeout}초 동안 보드 응답 없음 (동글/자동차 LED 확인)')
    print('자동차 연결 완료!')
    return conn


def drive_forward(speed: int) -> None:
    lamp_ai.dc_motor_all_on(*(d * speed for d in FORWARD))


def stop_car() -> None:
    lamp_ai.dc_motor_all_off()


def set_center_led(on: bool) -> None:
    lamp_ai.gpio_out(CENTER_LED_PIN, 1 if on else 0)


def save_capture(raw_frame, annotated_frame) -> Path:
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]
    cv2.imwrite(str(CAPTURE_DIR / f'{stamp}_raw.jpg'), raw_frame)
    annotated_path = CAPTURE_DIR / f'{stamp}_detected.jpg'
    cv2.imwrite(str(annotated_path), annotated_frame)
    return annotated_path


def draw_status(frame, text: str, ok: bool):
    cv2.putText(frame, text, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (0, 200, 0) if ok else (0, 0, 255), 2, cv2.LINE_AA)
    return frame


def main():
    parser = argparse.ArgumentParser(description='CrackBot 자율주행 균열 스캔')
    parser.add_argument('--dry-run', action='store_true',
                         help='차량에 연결하지 않고 카메라+탐지 파이프라인만 테스트')
    args = parser.parse_args()

    if not MODEL_PATH.exists():
        raise RuntimeError(f'모델 파일을 찾을 수 없습니다: {MODEL_PATH}')
    print('YOLO 모델 로딩 중...')
    from ultralytics import YOLO
    model = YOLO(str(MODEL_PATH))

    conn = None
    if not args.dry_run:
        conn = connect_car(PORT, BAUD)
    else:
        print('[dry-run] 차량 연결 생략 — 모터 명령은 콘솔에만 출력됩니다.')

    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    if not cap.isOpened():
        if conn:
            conn.close()
        raise RuntimeError(f'카메라(index={CAMERA_INDEX})를 열 수 없습니다. NCAM 동글 연결을 확인하세요.')

    driving = False
    last_infer = 0.0
    status_text = '정지 | G: 출발  SPACE: 정지  ESC: 종료'

    def set_driving(on: bool):
        nonlocal driving
        driving = on
        if on:
            if args.dry_run:
                print('[dry-run] 전진 명령 (실제 모터 동작 없음)')
            else:
                drive_forward(DRIVE_SPEED)
        else:
            if args.dry_run:
                print('[dry-run] 정지 명령 (실제 모터 동작 없음)')
            else:
                stop_car()

    def set_led(on: bool):
        if args.dry_run:
            print(f"[dry-run] 중앙 LED {'ON' if on else 'OFF'} (실제 동작 없음)")
        else:
            set_center_led(on)

    print('\n' + status_text + '  (미리보기 창에 포커스가 있어야 키 입력이 인식됩니다)')

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print('카메라 프레임을 읽지 못했습니다.')
                break

            display = frame
            now = time.time()

            if driving and (now - last_infer) >= INFER_INTERVAL:
                last_infer = now
                results = model(frame, verbose=False)[0]
                hits = [b for b in results.boxes if float(b.conf[0]) >= CONF_THRESHOLD]

                if hits:
                    set_driving(False)
                    set_led(True)
                    annotated = results.plot()
                    saved_path = save_capture(frame, annotated)
                    best_conf = max(float(b.conf[0]) for b in hits)
                    status_text = (f'균열 탐지! conf={best_conf:.2f} -> 정지, 저장: {saved_path.name}  '
                                    '| G: 재출발  ESC: 종료')
                    print('\n' + status_text)
                    display = annotated
                else:
                    display = results.plot()

            display = draw_status(display.copy(), status_text, driving)
            cv2.imshow('CrackBot Autonomous Scan', display)

            key = cv2.waitKey(1) & 0xFF
            if key == 27:  # ESC
                break
            elif key in (ord('g'), ord('G')) and not driving:
                set_led(False)
                set_driving(True)
                status_text = '주행 중 | SPACE: 정지  ESC: 종료'
                print('\n' + status_text)
            elif key == ord(' ') and driving:
                set_driving(False)
                status_text = '정지 | G: 출발  SPACE: 정지  ESC: 종료'
                print('\n' + status_text)

    finally:
        if not args.dry_run:
            stop_car()
            set_center_led(False)
        cap.release()
        cv2.destroyAllWindows()
        if conn:
            conn.close()
        print('\n모터 정지, 연결 종료.')


if __name__ == '__main__':
    main()
