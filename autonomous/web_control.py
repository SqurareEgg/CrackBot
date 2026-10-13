# -*- coding: utf-8 -*-
"""
CrackBot 자율주행 균열 스캔 — 웹 조작 패널 (독립 실행, drive_scan.py와 별개)

실행: python web_control.py
브라우저: http://localhost:8800  (차량과 같은 PC에서 열거나, 같은 Wi-Fi의 다른 기기에서
          http://<이 PC의 IP>:8800 으로 접속)

/ 에서 시리얼 포트 + 카메라를 스캔해서 고른 뒤 연결하면 /control 조작 패널로 넘어갑니다.
서버 자체는 하드웨어 연결 여부와 무관하게 항상 띄워져 있고, 재연결도 서버를 다시 켤
필요 없이 웹에서 바로 할 수 있습니다.
"""
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

# 일부 Windows 콘솔(cp949 등)은 한글 문장의 특수기호(—)를 못 쓰고 print()에서
# UnicodeEncodeError를 던진다 — 백그라운드 스레드 안에서 터지면 스레드가 조용히
# 죽어버리므로(=화면이 멈추거나 아예 안 보이게 됨) 출력 인코딩을 UTF-8로 강제한다.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

import cv2
import numpy as np
import serial.tools.list_ports
import uvicorn
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

import lamp_ai

# ── 설정 ──────────────────────────────────────────────────────────
BAUD = 38400
CAMERA_SCAN_RANGE = 6     # 카메라 인덱스 0~5 스캔

MODEL_PATH = Path(__file__).resolve().parent / 'model' / 'crack_best.pt'
CAPTURE_DIR = Path(__file__).resolve().parent / 'captures'
STATIC_DIR = Path(__file__).resolve().parent / 'static'

DEFAULT_SPEED = 60
CONF_THRESHOLD = 0.5
INFER_INTERVAL = 0.2     # 탐지 on일 때 추론 주기(초)
STREAM_INTERVAL = 0.05   # MJPEG 스트림 프레임 전송 주기(초)
FAIL_REOPEN_THRESHOLD = 20   # 연속 프레임 읽기 실패/정지 감지 시 재연결 시도 기준 (약 1초)

CENTER_LED_PIN = 3
SERVO_PIN = 3            # TODO: 실제 각도 서보가 연결된 핀으로 확인 후 수정 (3~6)
SERVO_SPEED = 20         # 0~30

DIRECTIONS = {
    # (l1, r1, l2, r2) — lamp_control.py MOVES와 동일한 매핑
    'forward':  (1, 1, 1, 1),
    'backward': (-1, -1, -1, -1),
    'left':     (-1, 1, 1, -1),   # 왼쪽으로 옆이동 (메카넘 strafe)
    'right':    (1, -1, -1, 1),   # 오른쪽으로 옆이동
}

WEB_PORT = 8800


# ── 하드웨어 스캔 ─────────────────────────────────────────────────
def scan_ports():
    return [{'device': p.device, 'description': p.description} for p in serial.tools.list_ports.comports()]


def scan_cameras(max_index: int = CAMERA_SCAN_RANGE):
    found = []
    for i in range(max_index):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        if cap.isOpened():
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            found.append({'index': i, 'width': w, 'height': h})
        cap.release()
    return found


# ── 하드웨어 래퍼 ─────────────────────────────────────────────────
def connect_car(port: str, baud: int, timeout: float = 10.0):
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


def set_center_led(on: bool) -> None:
    lamp_ai.gpio_out(CENTER_LED_PIN, 1 if on else 0)


def save_capture(raw_frame, annotated_frame) -> Path:
    CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]
    cv2.imwrite(str(CAPTURE_DIR / f'{stamp}_raw.jpg'), raw_frame)
    annotated_path = CAPTURE_DIR / f'{stamp}_detected.jpg'
    cv2.imwrite(str(annotated_path), annotated_frame)
    return annotated_path


# ── 공유 상태 (락으로 보호) ───────────────────────────────────────
class State:
    def __init__(self):
        self.lock = threading.Lock()
        self.speed = DEFAULT_SPEED
        self.angle = 0
        self.current_move = None     # None | 'forward' | 'backward' | 'left' | 'right'
        self.detecting = False
        self.led_on = False
        self.last_jpeg = None
        self.status = '연결 안 됨'


class Hardware:
    def __init__(self):
        self.lock = threading.Lock()
        self.conn = None
        self.cap = None
        self.vision_thread = None
        self.stop_event = None
        self.connected = False
        self.port = None
        self.camera_index = None


state = State()
hw = Hardware()
shutdown_event = threading.Event()
model = None  # main()에서 로드


def apply_move(direction: str | None):
    """direction=None이면 정지. 아니면 현재 속도로 해당 방향 주행."""
    with state.lock:
        state.current_move = direction
        speed = state.speed
    if direction is None:
        lamp_ai.dc_motor_all_off()
    else:
        dirs = DIRECTIONS[direction]
        lamp_ai.dc_motor_all_on(*(d * speed for d in dirs))


def apply_led(on: bool):
    with state.lock:
        state.led_on = on
    set_center_led(on)


# ── 카메라 + 탐지 백그라운드 루프 ─────────────────────────────────
def vision_loop(camera_index: int, stop_event: threading.Event):
    last_infer = 0.0
    fail_count = 0
    last_frame = None

    def reopen(reason: str):
        # DSHOW 백엔드는 같은 VideoCapture 객체에 release()+open()을 반복하면
        # "can't be used to capture by index" 상태로 완전히 망가지는 경우가 있어서,
        # 아예 새 VideoCapture 객체를 만들어 hw.cap을 교체한다.
        print(f'카메라 {reason} — 재연결 시도...')
        new_cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
        with hw.lock:
            old_cap = hw.cap
            hw.cap = new_cap
        if old_cap is not None:
            old_cap.release()
        return new_cap

    while not stop_event.is_set():
        try:
            with hw.lock:
                cap = hw.cap
            if cap is None:
                time.sleep(0.05)
                continue

            ok, frame = cap.read()
            if not ok:
                fail_count += 1
                if fail_count == 1:
                    print('카메라 프레임을 못 읽는 중...')
                if fail_count >= FAIL_REOPEN_THRESHOLD:
                    reopen(f'연속 읽기 실패 {fail_count}회')
                    fail_count = 0
                time.sleep(0.05)
                continue

            # 일부 무선 수신 동글은 신호가 끊겨도 read()가 ok=True로 마지막 프레임을
            # 계속 반환한다 — 내용이 그대로인 프레임이 오래 이어지면 멈춘 것으로 간주.
            if last_frame is not None and frame.shape == last_frame.shape and np.array_equal(frame, last_frame):
                fail_count += 1
                if fail_count >= FAIL_REOPEN_THRESHOLD:
                    reopen(f'영상 정지 감지 (동일 프레임 {fail_count}회)')
                    fail_count = 0
                    last_frame = None
                time.sleep(0.05)
                continue
            last_frame = frame.copy()
            fail_count = 0

            display = frame
            with state.lock:
                detecting = state.detecting
                moving = state.current_move is not None

            now = time.time()
            if detecting and (now - last_infer) >= INFER_INTERVAL:
                last_infer = now
                results = model(frame, verbose=False)[0]
                hits = [b for b in results.boxes if float(b.conf[0]) >= CONF_THRESHOLD]
                display = results.plot()

                if hits and moving:
                    apply_move(None)
                    apply_led(True)
                    saved_path = save_capture(frame, display)
                    best_conf = max(float(b.conf[0]) for b in hits)
                    with state.lock:
                        state.status = f'균열 탐지! conf={best_conf:.2f} -> 정지, 저장: {saved_path.name}'
                    print('\n' + state.status)

            ok2, buf = cv2.imencode('.jpg', display, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ok2:
                with state.lock:
                    state.last_jpeg = buf.tobytes()

            time.sleep(0.01)
        except Exception as e:
            # 어떤 예외가 나도 백그라운드 스레드가 죽지 않도록 방어 — 여기서 죽으면
            # 영상이 영원히 멈추고 복구 불가능해진다.
            print(f'[vision_loop] 예외 발생, 계속 진행: {e!r}')
            time.sleep(0.2)


def disconnect_hardware():
    """현재 연결된 차량/카메라를 정리합니다. 연결 안 돼 있으면 아무것도 하지 않습니다."""
    with hw.lock:
        conn, cap, stop_event = hw.conn, hw.cap, hw.stop_event
        worker = hw.vision_thread
        hw.conn = hw.cap = hw.vision_thread = hw.stop_event = None
        hw.connected = False
        hw.port = hw.camera_index = None

    if stop_event:
        stop_event.set()
    if worker:
        worker.join(timeout=2)
    if conn:
        apply_move(None)
        apply_led(False)
    if cap:
        cap.release()
    if conn:
        conn.close()

    with state.lock:
        state.current_move = None
        state.led_on = False
        state.last_jpeg = None
        state.status = '연결 안 됨'


# ── FastAPI 앱 ────────────────────────────────────────────────────
app = FastAPI()
_server: uvicorn.Server | None = None


class SpeedBody(BaseModel):
    value: int


class AngleBody(BaseModel):
    value: int


class DetectBody(BaseModel):
    enabled: bool


class ConnectBody(BaseModel):
    port: str
    camera_index: int


@app.get('/', response_class=HTMLResponse)
def setup_page():
    return (STATIC_DIR / 'setup.html').read_text(encoding='utf-8')


@app.get('/control', response_class=HTMLResponse)
def control_page():
    return (STATIC_DIR / 'control.html').read_text(encoding='utf-8')


@app.get('/ports')
def get_ports():
    return {'ports': scan_ports()}


@app.get('/cameras')
def get_cameras():
    return {'cameras': scan_cameras()}


@app.post('/connect')
def connect(body: ConnectBody):
    disconnect_hardware()

    try:
        conn = connect_car(body.port, BAUD)
    except Exception as e:
        return {'ok': False, 'error': f'차량 연결 실패: {e}'}

    cap = cv2.VideoCapture(body.camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        conn.close()
        return {'ok': False, 'error': f'카메라(index={body.camera_index})를 열 수 없습니다.'}

    stop_event = threading.Event()

    with hw.lock:
        hw.conn = conn
        hw.cap = cap
        hw.stop_event = stop_event
        hw.connected = True
        hw.port = body.port
        hw.camera_index = body.camera_index

    worker = threading.Thread(target=vision_loop, args=(body.camera_index, stop_event), daemon=True)
    with hw.lock:
        hw.vision_thread = worker
    worker.start()

    with state.lock:
        state.status = '정지'

    return {'ok': True}


@app.post('/disconnect')
def disconnect():
    disconnect_hardware()
    return {'ok': True}


@app.get('/stream')
def stream():
    def gen():
        boundary = b'--frame'
        while not shutdown_event.is_set():
            with state.lock:
                jpeg = state.last_jpeg
            if jpeg is not None:
                yield (boundary + b'\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n')
            time.sleep(STREAM_INTERVAL)

    return StreamingResponse(gen(), media_type='multipart/x-mixed-replace; boundary=frame')


@app.get('/state')
def get_state():
    with state.lock, hw.lock:
        return {
            'connected': hw.connected,
            'port': hw.port,
            'camera_index': hw.camera_index,
            'speed': state.speed,
            'angle': state.angle,
            'current_move': state.current_move,
            'detecting': state.detecting,
            'led_on': state.led_on,
            'status': state.status,
        }


@app.post('/move/{direction}')
def move(direction: str):
    if not hw.connected:
        return {'ok': False, 'error': '연결되지 않았습니다'}
    if direction == 'stop':
        apply_move(None)
        with state.lock:
            state.status = '정지'
    elif direction in DIRECTIONS:
        with state.lock:
            was_led_on = state.led_on
        if was_led_on:
            apply_led(False)
        apply_move(direction)
        with state.lock:
            state.status = f'{direction} 주행 중'
    else:
        return {'ok': False, 'error': f'알 수 없는 방향: {direction}'}
    return {'ok': True}


@app.post('/speed')
def set_speed(body: SpeedBody):
    value = max(0, min(100, body.value))
    with state.lock:
        state.speed = value
        moving = state.current_move
    if moving and hw.connected:
        apply_move(moving)  # 현재 방향에 새 속도 즉시 반영
    return {'ok': True, 'speed': value}


@app.post('/angle')
def set_angle(body: AngleBody):
    if not hw.connected:
        return {'ok': False, 'error': '연결되지 않았습니다'}
    value = max(-90, min(90, body.value))
    lamp_ai.servo_motor(SERVO_PIN, value, SERVO_SPEED)
    with state.lock:
        state.angle = value
    return {'ok': True, 'angle': value}


@app.post('/detect')
def set_detect(body: DetectBody):
    with state.lock:
        state.detecting = body.enabled
    if not body.enabled:
        apply_led(False)
    return {'ok': True, 'detecting': body.enabled}


@app.post('/exit')
def exit_now():
    print('\n종료 요청 수신 — 정리 중...')
    shutdown_event.set()
    disconnect_hardware()
    if _server is not None:
        _server.should_exit = True
    return {'ok': True}


def main():
    global _server, model

    if not MODEL_PATH.exists():
        raise RuntimeError(f'모델 파일을 찾을 수 없습니다: {MODEL_PATH}')
    print('YOLO 모델 로딩 중...')
    from ultralytics import YOLO
    model = YOLO(str(MODEL_PATH))

    config = uvicorn.Config(app, host='0.0.0.0', port=WEB_PORT, log_level='info')
    _server = uvicorn.Server(config)

    print(f'\n조작 패널: http://localhost:{WEB_PORT}  (여기서 포트/카메라 선택 후 연결)')
    try:
        _server.run()
    finally:
        disconnect_hardware()
        print('\n모터 정지, 연결 종료.')


if __name__ == '__main__':
    main()
