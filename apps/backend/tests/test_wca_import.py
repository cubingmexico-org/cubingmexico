from routes.admin.wca_import import parse_wca_export_date


def test_parse_wca_export_date():
    raw = b'{"export_date": "2026-10-23T00:00:12Z", "export_format_version": "v2.0.0"}'
    assert parse_wca_export_date(raw) == "2026-10-23T00:00:12Z"


def test_parse_wca_export_date_missing_or_invalid():
    assert parse_wca_export_date(b"{}") is None
    assert parse_wca_export_date(b"not json") is None
    assert parse_wca_export_date(b"[]") is None
