try:
    from database.database import AnalysisRecord, Base
except ImportError:
    from backend.database.database import AnalysisRecord, Base

