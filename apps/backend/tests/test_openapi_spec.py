"""packages/public-api/openapi.json documents exactly the public routes, with valid examples."""

import pytest
from jsonschema import Draft202012Validator

from tests_integration.openapi import SPEC, public_routes, response_content, validator


def test_spec_documents_every_public_route(app):
    assert public_routes(app) == set(SPEC["paths"])


def test_spec_documents_only_get(app):
    for path, operations in SPEC["paths"].items():
        assert set(operations) == {"get"}, path


def test_component_schemas_are_valid():
    for schema in SPEC["components"]["schemas"].values():
        Draft202012Validator.check_schema(schema)


EXAMPLES = [
    (path, status)
    for path, operations in SPEC["paths"].items()
    for status in operations["get"]["responses"]
    if "example" in response_content(path, int(status))
]


@pytest.mark.parametrize(("path", "status"), EXAMPLES)
def test_examples_match_their_schema(path, status):
    content = response_content(path, int(status))
    validator(content["schema"]).validate(content["example"])


def test_every_path_parameter_is_documented():
    for path, operations in SPEC["paths"].items():
        documented = {
            param.get("name") or param["$ref"].rsplit("/", 1)[-1] for param in operations["get"].get("parameters", [])
        }
        resolved = set()
        for name in documented:
            param = SPEC["components"]["parameters"].get(name, {"name": name})
            resolved.add(param["name"])
        for segment in path.split("/"):
            if segment.startswith("{"):
                assert segment.strip("{}") in resolved, f"{path}: {segment} is not documented"
