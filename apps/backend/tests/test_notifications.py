import requests

import notifications

STEPS = [
    {"name": "update_full_database", "status": "succeeded"},
    {"name": "update_state_ranks", "status": "failed", "error": "deadlock detected"},
    {"name": "update_state_records", "status": "pending"},
]


class FakeResponse:
    def __init__(self, status_code=200):
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")


def test_failure_message_names_the_failed_step():
    message = notifications.failure_message("update_all", "run-1", STEPS, "Error occurred during update_state_ranks")

    assert message.splitlines() == [
        "update_all failed (run run-1)",
        "Error occurred during update_state_ranks",
        "update_state_ranks: deadlock detected",
        "Resume it from the admin ops page or with POST /update-all/resume.",
    ]


def test_does_nothing_without_a_webhook(monkeypatch):
    calls = []
    monkeypatch.setattr(notifications, "JOB_FAILURE_WEBHOOK_URL", None)
    monkeypatch.setattr(notifications.requests, "post", lambda *args, **kwargs: calls.append(args))

    notifications.notify_job_failure("update_all", "run-1", STEPS, "boom")

    assert calls == []


def test_posts_slack_and_discord_fields(monkeypatch):
    calls = []
    monkeypatch.setattr(notifications, "JOB_FAILURE_WEBHOOK_URL", "https://hooks.example/abc")

    def fake_post(url, **kwargs):
        calls.append((url, kwargs["json"]))
        return FakeResponse()

    monkeypatch.setattr(notifications.requests, "post", fake_post)

    notifications.notify_job_failure("update_all", "run-1", STEPS, "boom")

    [(url, payload)] = calls
    assert url == "https://hooks.example/abc"
    assert payload["text"] == payload["content"]
    assert payload["text"].startswith("update_all failed (run run-1)")


def test_webhook_errors_are_swallowed(monkeypatch):
    monkeypatch.setattr(notifications, "JOB_FAILURE_WEBHOOK_URL", "https://hooks.example/abc")
    monkeypatch.setattr(notifications.requests, "post", lambda *args, **kwargs: FakeResponse(500))

    notifications.notify_job_failure("update_all", "run-1", STEPS, "boom")
