#!/usr/bin/env python3
"""Read-only preflight for CSV exports from the legacy MySQL database.

Prints counts and blockers without printing names, email addresses, or resume text.
"""

import argparse
import csv
import json
from pathlib import Path


REQUIRED = {
    "users": {"id", "email"},
    "job_descriptions": {"id", "created_by", "title"},
    "resumes": {"id", "candidate_id", "file_path"},
    "applications": {"id", "job_id", "resume_id", "status"},
}
STATUSES = {"PENDING", "ACCEPTED", "REJECTED"}


def read_table(directory: Path, name: str):
    path = directory / f"{name}.csv"
    if not path.is_file():
        raise ValueError(f"Missing {name}.csv")
    with path.open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        missing = REQUIRED[name] - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"{name}.csv is missing columns: {', '.join(sorted(missing))}")
        return list(reader)


def inspect(directory: Path, file_root: Path):
    tables = {name: read_table(directory, name) for name in REQUIRED}
    blockers = {}

    def add(code, count=1):
        blockers[code] = blockers.get(code, 0) + count

    ids = {}
    for name, rows in tables.items():
        values = [row["id"].strip() for row in rows]
        ids[name] = set(values)
        if len(values) != len(ids[name]) or "" in ids[name]:
            add(f"{name}:duplicate_or_empty_id", len(values) - len(ids[name]) + values.count(""))

    emails = [row["email"].strip().lower() for row in tables["users"]]
    if len(set(emails)) != len(emails) or "" in emails:
        add("users:duplicate_or_empty_email", len(emails) - len(set(emails)) + emails.count(""))
    for job in tables["job_descriptions"]:
        if job["created_by"].strip() not in ids["users"]:
            add("jobs:missing_creator")
    for resume in tables["resumes"]:
        if resume["candidate_id"].strip() not in ids["users"]:
            add("resumes:missing_candidate")
        relative = Path(resume["file_path"].strip())
        if not relative.parts or relative.is_absolute() or ".." in relative.parts:
            add("resumes:unsafe_path")
        elif not (file_root / relative).is_file():
            add("resumes:missing_file")
    for application in tables["applications"]:
        if application["job_id"].strip() not in ids["job_descriptions"]:
            add("applications:missing_job")
        if application["resume_id"].strip() not in ids["resumes"]:
            add("applications:missing_resume")
        if application["status"].strip().upper() not in STATUSES:
            add("applications:unknown_status")

    return {"record_counts": {name: len(rows) for name, rows in tables.items()},
            "blockers": blockers, "ready_for_mapping_review": not bool(blockers)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export_dir", type=Path, help="Directory with four legacy CSV exports")
    parser.add_argument("--file-root", type=Path, required=True, help="Root of copied legacy resume files")
    args = parser.parse_args()
    try:
        report = inspect(args.export_dir, args.file_root)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(report, indent=2, sort_keys=True))
    raise SystemExit(0 if report["ready_for_mapping_review"] else 2)


if __name__ == "__main__":
    main()
