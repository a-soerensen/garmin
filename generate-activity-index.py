from pathlib import Path
import json

# Repository root (where this script lives)
repo_root = Path(__file__).resolve().parent

# Target directories
activity_data_root = repo_root / "data" / "activity_data"
activity_core_dir = activity_data_root / "activity_core"

# Output file
output_file = activity_data_root / "activity_index.json"

if not activity_core_dir.exists():
    raise FileNotFoundError(f"Could not find activity_core directory: {activity_core_dir}")

# Recursively find all JSON files inside activity_core
files = sorted(
    str(path.relative_to(activity_data_root)).replace("\\", "/")
    for path in activity_core_dir.rglob("*.json")
)

# Write the index file
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(files, f, indent=2)

print(f"Generated activity_index.json with {len(files)} entries.")
print(f"Location: {output_file}")