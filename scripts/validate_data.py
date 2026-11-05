from scripts.news.validate import validate_pair
from scripts.news.model import ROOT, read_json

validate_pair(
    read_json(ROOT / "public/data/news.json", {}),
    read_json(ROOT / "public/data/sources-status.json", {}),
)
print("Production JSON pair verified")
