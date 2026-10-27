"""Helpers for checking the public API against packages/public-api/openapi.json."""

import json
import re
from pathlib import Path

from jsonschema import Draft202012Validator

SPEC_FILE = Path(__file__).resolve().parents[3] / "packages" / "public-api" / "openapi.json"
SPEC = json.loads(SPEC_FILE.read_text())

PUBLIC_BLUEPRINTS = {"competitions", "persons", "misc"}


def spec_path(rule: str) -> str:
    """Flask rule (`/persons/<wca_id>`) to OpenAPI path (`/persons/{wca_id}`)."""
    return re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", rule)


def public_routes(app) -> set[str]:
    return {
        spec_path(rule.rule) for rule in app.url_map.iter_rules() if rule.endpoint.split(".")[0] in PUBLIC_BLUEPRINTS
    }


def _resolve(node):
    ref = node.get("$ref")
    if not ref:
        return node
    target = SPEC
    for part in ref.removeprefix("#/").split("/"):
        target = target[part]
    return target


def response_content(path: str, status: int) -> dict:
    """The `application/json` media type object documented for `GET path` and `status`."""
    responses = SPEC["paths"][path]["get"]["responses"]
    assert str(status) in responses, f"GET {path} doesn't document status {status}"
    return _resolve(responses[str(status)])["content"]["application/json"]


def validator(schema: dict) -> Draft202012Validator:
    return Draft202012Validator({"components": SPEC["components"], **schema})


def assert_matches_spec(path: str, response) -> None:
    schema = response_content(path, response.status_code)["schema"]
    validator(schema).validate(response.get_json())
