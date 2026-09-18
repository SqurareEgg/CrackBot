"""Integration test for the CrackBot AI API with YOLO detection."""
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

BASE_URL = "http://localhost:8000"
DEMO_IMAGE = Path(__file__).parent.parent / "Crack Detection(6.8)" / "demo_images" / "Cracked_01.jpg"


def post_json(url, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def post_multipart(url, filepath, token):
    """Send multipart/form-data with a single file field 'file'."""
    boundary = "----CrackBotBoundary1234"
    filename = Path(filepath).name
    file_bytes = Path(filepath).read_bytes()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def get_json(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def check(label, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"  [{status}] {label}{': ' + detail if detail else ''}")
    return cond


passed = 0
failed = 0

print("=" * 60)
print("CrackBot AI API Integration Test")
print("=" * 60)

# ── Test 1: Health check ──
print("\n[1] Root health check")
try:
    r = get_json(f"{BASE_URL}/")
    if check("GET /", r.get("message") == "CrackBot AI API"):
        passed += 1
    else:
        failed += 1
except Exception as e:
    check("GET /", False, str(e))
    failed += 1

# ── Test 2: Login ──
print("\n[2] Authentication")
token = None
try:
    r = post_json(f"{BASE_URL}/v1/auth/login", {"email": "admin@crackbot.ai", "password": "crackbot123"})
    token = r.get("data", {}).get("access_token")
    if check("POST /v1/auth/login", token is not None, f"token={token[:20] + '...' if token else None}"):
        passed += 1
    else:
        failed += 1
except Exception as e:
    check("POST /v1/auth/login", False, str(e))
    failed += 1

if not token:
    print("\nCannot continue without auth token.")
    sys.exit(1)

# ── Test 3: Direct detection ──
print("\n[3] Direct crack detection (POST /v1/photos/detect)")
try:
    if not DEMO_IMAGE.exists():
        print(f"  Demo image not found: {DEMO_IMAGE}")
        failed += 1
    else:
        r = post_multipart(f"{BASE_URL}/v1/photos/detect", DEMO_IMAGE, token)
        count = r.get("data", {}).get("count", -1)
        has_image = bool(r.get("data", {}).get("annotated_image_base64"))
        detections = r.get("data", {}).get("detections", [])

        if check("response success", r.get("success") is True):
            passed += 1
        else:
            failed += 1

        if check("returns count", count >= 0, f"count={count}"):
            passed += 1
        else:
            failed += 1

        if check("returns annotated image", has_image):
            passed += 1
        else:
            failed += 1

        print(f"  >>> {count} crack(s) detected")
        for d in detections:
            print(f"      class={d['class_name']} conf={d['confidence']} severity={d['severity']} width={d['crack_width_mm']}mm")
except Exception as e:
    check("POST /v1/photos/detect", False, str(e))
    failed += 1

# ── Test 4: OpenAPI docs ──
print("\n[4] OpenAPI docs reachable")
try:
    r = get_json(f"{BASE_URL}/openapi.json")
    if check("GET /openapi.json", "paths" in r):
        passed += 1
    else:
        failed += 1
    detect_path_exists = "/v1/photos/detect" in r.get("paths", {})
    if check("/v1/photos/detect in schema", detect_path_exists):
        passed += 1
    else:
        failed += 1
except Exception as e:
    check("GET /openapi.json", False, str(e))
    failed += 1

# ── Summary ──
print("\n" + "=" * 60)
print(f"Results: {passed} passed, {failed} failed")
print("=" * 60)
sys.exit(0 if failed == 0 else 1)
