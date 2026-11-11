import sys
import os

# Allow importing from backend
_backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend_dir))

from modules.sentiment_model import SentimentModel


def get_model() -> SentimentModel:
    return SentimentModel.get_instance()
