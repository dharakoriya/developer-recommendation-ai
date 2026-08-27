import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.database import SessionLocal
from app.services.realworld_dataset_service import export_realworld_dataset, evaluate_model_training_readiness


def run_realworld_dataset_export():
    """
    Standalone research script to export realworld-v1 dataset files to research/dataset/realworld/.
    """
    db = SessionLocal()
    try:
        print("[+] Starting Real-World Research Dataset Exporter (realworld-v1)...")
        readiness = evaluate_model_training_readiness(db)
        print(f"[i] Readiness Status: {readiness.readiness_status.value}")
        print(f"[i] Summary: {readiness.readiness_summary}")

        export_meta = export_realworld_dataset(db)
        print(f"[✓] Exported {export_meta.total_observations} total observations, {export_meta.labeled_observations} labeled, {export_meta.validated_observations} validated.")
        print(f"[✓] Files written to research/dataset/realworld/: {', '.join(export_meta.exported_files)}")
    finally:
        db.close()


if __name__ == "__main__":
    run_realworld_dataset_export()
