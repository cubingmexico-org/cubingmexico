from flask import abort


def test_unhandled_exception_returns_json_500(app):
    @app.route("/__boom")
    def boom():
        raise RuntimeError("secret detail")

    resp = app.test_client().get("/__boom")
    assert resp.status_code == 500
    assert resp.get_json() == {"success": False, "message": "Internal server error"}


def test_http_exceptions_pass_through(app):
    @app.route("/__forbidden")
    def forbidden():
        abort(403)

    client = app.test_client()
    assert client.get("/__forbidden").status_code == 403
    assert client.get("/__does-not-exist").status_code == 404
