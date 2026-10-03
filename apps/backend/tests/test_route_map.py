import json
import os
from pathlib import Path

from common import require_cron_auth

SNAPSHOT = Path(__file__).parent / "snapshots" / "route_map.json"
_CRON_AUTH_CODE = require_cron_auth(lambda: None).__code__


def _route_map(app):
    routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint == "static":
            continue
        view = app.view_functions[rule.endpoint]
        routes.append(
            {
                "rule": rule.rule,
                "methods": sorted(rule.methods - {"HEAD", "OPTIONS"}),
                "endpoint": rule.endpoint,
                "cron_auth": view.__code__ is _CRON_AUTH_CODE,
            }
        )
    return sorted(routes, key=lambda r: (r["rule"], r["endpoint"]))


def test_route_map_matches_snapshot(app):
    current = _route_map(app)
    if os.environ.get("UPDATE_SNAPSHOTS") == "1" or not SNAPSHOT.exists():
        SNAPSHOT.parent.mkdir(exist_ok=True)
        SNAPSHOT.write_text(json.dumps(current, indent=2) + "\n")
    assert current == json.loads(SNAPSHOT.read_text())
