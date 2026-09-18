def calculate_grade(max_crack_mm: float | None, defect_count: int) -> str:
    """
    Calculate safety grade based on maximum crack width and defect count.

    Grade thresholds:
    - >= 0.5mm  -> E (immediate action required)
    - >= 0.3mm  -> D (urgent repair)
    - >= 0.2mm  -> C (detailed inspection)
    - >= 0.1mm  -> B (periodic monitoring)
    - < 0.1mm or None with defects -> B
    - No defects -> A
    """
    if max_crack_mm is None:
        return "A" if defect_count == 0 else "B"
    if max_crack_mm >= 0.5:
        return "E"
    if max_crack_mm >= 0.3:
        return "D"
    if max_crack_mm >= 0.2:
        return "C"
    if max_crack_mm >= 0.1:
        return "B"
    return "A"


def grade_recommendation(grade: str, max_crack_mm: float | None) -> str:
    """Return Korean recommendation string based on grade."""
    crack_info = f"{max_crack_mm}mm " if max_crack_mm is not None else ""
    recs = {
        "E": "즉각적인 사용 중지 및 긴급 보수 필요",
        "D": f"균열 {crack_info}기준치 초과. 긴급 보수 권고",
        "C": "정밀 안전진단 실시 권고",
        "B": "주기적 모니터링 권고",
        "A": "이상 없음",
    }
    return recs.get(grade, "")
