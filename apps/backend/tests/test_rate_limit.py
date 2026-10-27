import app as app_module

# Fails validation before touching the database; rejected requests still count.
PUBLIC_URL = "/rank/best/333"
PROTECTED_URL = "/social/summary-unlock/2025/caption"
LIMIT = 60


def test_default_limit():
    assert app_module.PUBLIC_RATE_LIMIT == "60 per minute"


def test_public_routes_are_rate_limited(client):
    for _ in range(LIMIT):
        assert client.get(PUBLIC_URL).status_code == 400

    response = client.get(PUBLIC_URL)
    assert response.status_code == 429
    assert response.get_json() == {"success": False, "message": "Too many requests"}
    assert "Retry-After" in response.headers


def test_limit_is_per_client_address(client):
    for _ in range(LIMIT):
        client.get(PUBLIC_URL, headers={"X-Forwarded-For": "203.0.113.1"})

    assert client.get(PUBLIC_URL, headers={"X-Forwarded-For": "203.0.113.1"}).status_code == 429
    assert client.get(PUBLIC_URL, headers={"X-Forwarded-For": "203.0.113.2"}).status_code == 400


def test_spoofed_forwarded_for_is_ignored(client):
    # Cloud Run appends the real address, so only the last hop identifies the client.
    for i in range(LIMIT):
        client.get(PUBLIC_URL, headers={"X-Forwarded-For": f"198.51.100.{i}, 203.0.113.9"})

    assert client.get(PUBLIC_URL, headers={"X-Forwarded-For": "198.51.100.200, 203.0.113.9"}).status_code == 429


def test_admin_routes_are_not_rate_limited(client):
    for _ in range(LIMIT + 10):
        assert client.get(PROTECTED_URL).status_code == 401
