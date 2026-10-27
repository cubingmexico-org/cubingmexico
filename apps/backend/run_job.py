"""Entry point for the update-all Cloud Run Job: `python run_job.py update-all [--resume]`.

Exits 0 when the run succeeds, 1 when it fails or can't start. Cloud Run sends SIGTERM before
killing a task (timeout, cancellation); the run is then marked failed so `--resume` can continue it.
"""

import argparse
import json
import signal
import sys
from types import FrameType

from app import create_app
from common import log
from routes.admin.update_all import run_update_all


def _exit_on_sigterm(signum: int, _frame: FrameType | None) -> None:
    log.warning("Received signal %s; stopping", signum)
    raise SystemExit(128 + signum)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("job", choices=["update-all"])
    parser.add_argument("--resume", action="store_true", help="continue the latest failed run")
    args = parser.parse_args(argv)

    signal.signal(signal.SIGTERM, _exit_on_sigterm)

    # Some steps build Flask responses internally, so they need an app context.
    with create_app().app_context():
        body, status = run_update_all(resume=args.resume)

    summary = {key: body[key] for key in ("success", "message", "runId") if key in body}
    log.info("update-all finished with status %s: %s", status, json.dumps(summary))
    return 0 if status == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
