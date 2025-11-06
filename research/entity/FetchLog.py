from dataclasses import dataclass
from datetime import date
@dataclass
class FetchLog:
    id: int
    job_type: str
    job_status: str
    msg: str
    created_at: date