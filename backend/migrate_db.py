"""
migrate_db.py -- Adds new columns introduced in the Task A/B/C improvement.

New columns:
  submissions.requirements_met     INTEGER DEFAULT 0
  submissions.requirements_total   INTEGER DEFAULT 0
  issues.severity                  TEXT DEFAULT 'medium'

Safe to run multiple times (idempotent).
"""
from database import engine
from sqlalchemy import inspect, text


def migrate():
    with engine.connect() as conn:
        insp = inspect(engine)

        # submissions table
        sub_cols = [c["name"] for c in insp.get_columns("submissions")]
        if "requirements_met" not in sub_cols:
            conn.execute(text(
                "ALTER TABLE submissions ADD COLUMN requirements_met INTEGER NOT NULL DEFAULT 0"
            ))
            print("[OK] Added submissions.requirements_met")
        else:
            print("[SKIP] submissions.requirements_met already exists")

        if "requirements_total" not in sub_cols:
            conn.execute(text(
                "ALTER TABLE submissions ADD COLUMN requirements_total INTEGER NOT NULL DEFAULT 0"
            ))
            print("[OK] Added submissions.requirements_total")
        else:
            print("[SKIP] submissions.requirements_total already exists")

        # issues table
        issue_cols = [c["name"] for c in insp.get_columns("issues")]
        if "severity" not in issue_cols:
            conn.execute(text(
                "ALTER TABLE issues ADD COLUMN severity TEXT DEFAULT 'medium'"
            ))
            print("[OK] Added issues.severity")
        else:
            print("[SKIP] issues.severity already exists")

        conn.commit()
    print("[OK] Migration complete.")


if __name__ == "__main__":
    migrate()
