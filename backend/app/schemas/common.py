from datetime import datetime
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    message: str = "요청이 처리되었습니다."
    timestamp: str = ""

    model_config = {"arbitrary_types_allowed": True}


def ok(data=None, message: str = "요청이 처리되었습니다.") -> dict:
    return {
        "success": True,
        "data": data,
        "message": message,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def err(message: str, code: str = "ERROR") -> dict:
    return {
        "success": False,
        "error": {"code": code, "message": message},
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int
