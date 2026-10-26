import requests

import web_cache


class FakeResponse:
    def __init__(self, status_code=200):
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")


def test_skips_when_web_url_is_unset(monkeypatch):
    calls = []
    monkeypatch.setattr(web_cache, "WEB_URL", None)
    monkeypatch.setattr(web_cache.requests, "post", lambda *args, **kwargs: calls.append(args))

    web_cache.revalidate_web_tags(["cc-results"])

    assert calls == []


def test_posts_tags_with_the_cron_secret(monkeypatch):
    calls = []
    monkeypatch.setattr(web_cache, "WEB_URL", "https://web.example")

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return FakeResponse()

    monkeypatch.setattr(web_cache.requests, "post", fake_post)

    web_cache.revalidate_web_tags(["cc-results", "data-source-dates"])

    [(url, kwargs)] = calls
    assert url == "https://web.example/api/revalidate"
    assert kwargs["json"] == {"tags": ["cc-results", "data-source-dates"]}
    assert kwargs["headers"] == {"Authorization": "Bearer test-secret"}


def test_failures_are_logged_not_raised(monkeypatch):
    monkeypatch.setattr(web_cache, "WEB_URL", "https://web.example")
    monkeypatch.setattr(web_cache.requests, "post", lambda *args, **kwargs: FakeResponse(500))

    web_cache.revalidate_web_tags(["cc-results"])
