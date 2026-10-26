import pytest

from routes.admin import update_all as update_all_module

from .factories import AUTH_HEADERS, fetch_all


class Steps:
    """Fake update-all steps that record their calls; `fail` names the steps that raise."""

    def __init__(self, fail=()):
        self.fail = set(fail)
        self.calls = []

    def step(self, name):
        def run():
            self.calls.append(name)
            if name in self.fail:
                raise RuntimeError(f"{name} broke")
            return {"message": f"{name} done"}

        return run

    def install(self, monkeypatch):
        names = ["first", "second", "third", "fourth", "optional"]
        monkeypatch.setattr(
            update_all_module,
            "UPDATE_ALL_STEPS",
            [(name, self.step(name), name != "optional") for name in names],
        )


def _runs(db):
    return fetch_all(db, "SELECT id, status, steps, resumed_from, error FROM job_runs ORDER BY started_at")


def _statuses(run):
    return {step["name"]: step["status"] for step in run["steps"]}


def test_successful_run_records_every_step(client, db, monkeypatch):
    steps = Steps()
    steps.install(monkeypatch)

    response = client.post("/update-all", headers=AUTH_HEADERS)

    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert body["success"] is True
    assert [step["status"] for step in body["steps"]] == ["succeeded"] * 5
    assert steps.calls == ["first", "second", "third", "fourth", "optional"]

    [run] = _runs(db)
    assert run["status"] == "succeeded"
    assert run["id"] == body["runId"]
    assert run["steps"][0]["result"] == {"message": "first done"}


def test_failed_required_step_stops_the_run_and_keeps_details(client, db, monkeypatch):
    steps = Steps(fail={"third"})
    steps.install(monkeypatch)

    response = client.post("/update-all", headers=AUTH_HEADERS)

    assert response.status_code == 500
    body = response.get_json()
    assert body["message"] == "Error occurred during third"
    assert [step["status"] for step in body["steps"]] == ["succeeded", "succeeded", "failed", "pending", "pending"]
    assert body["steps"][2]["error"] == "third broke"
    assert steps.calls == ["first", "second", "third"]

    [run] = _runs(db)
    assert run["status"] == "failed"
    assert run["error"] == "Error occurred during third"
    assert _statuses(run) == {
        "first": "succeeded",
        "second": "succeeded",
        "third": "failed",
        "fourth": "pending",
        "optional": "pending",
    }


def test_failed_optional_step_does_not_fail_the_run(client, db, monkeypatch):
    steps = Steps(fail={"optional"})
    steps.install(monkeypatch)

    response = client.post("/update-all", headers=AUTH_HEADERS)

    assert response.status_code == 200, response.get_json()
    [run] = _runs(db)
    assert run["status"] == "succeeded"
    assert _statuses(run)["optional"] == "failed"


def test_resume_skips_steps_that_already_succeeded(client, db, monkeypatch):
    Steps(fail={"third"}).install(monkeypatch)
    assert client.post("/update-all", headers=AUTH_HEADERS).status_code == 500

    steps = Steps()
    steps.install(monkeypatch)
    response = client.post("/update-all/resume", headers=AUTH_HEADERS)

    assert response.status_code == 200, response.get_json()
    assert steps.calls == ["third", "fourth", "optional"]

    failed, resumed = _runs(db)
    assert resumed["status"] == "succeeded"
    assert resumed["resumed_from"] == failed["id"]
    assert _statuses(resumed) == {
        "first": "skipped",
        "second": "skipped",
        "third": "succeeded",
        "fourth": "succeeded",
        "optional": "succeeded",
    }


def test_resume_after_a_failed_resume_keeps_skipping_earlier_steps(client, monkeypatch):
    Steps(fail={"second"}).install(monkeypatch)
    client.post("/update-all", headers=AUTH_HEADERS)
    Steps(fail={"fourth"}).install(monkeypatch)
    assert client.post("/update-all/resume", headers=AUTH_HEADERS).status_code == 500

    steps = Steps()
    steps.install(monkeypatch)
    assert client.post("/update-all/resume", headers=AUTH_HEADERS).status_code == 200
    assert steps.calls == ["fourth", "optional"]


@pytest.mark.parametrize("seed_status", [None, "succeeded"])
def test_resume_needs_a_failed_latest_run(client, db, monkeypatch, seed_status):
    if seed_status:
        Steps().install(monkeypatch)
        client.post("/update-all", headers=AUTH_HEADERS)

    response = client.post("/update-all/resume", headers=AUTH_HEADERS)

    assert response.status_code == 404


def test_rejects_a_run_while_another_is_running(client, db, monkeypatch):
    db.cursor().execute(
        "INSERT INTO job_runs (id, job, status, started_at) VALUES ('active', 'update_all', 'running', NOW())"
    )
    steps = Steps()
    steps.install(monkeypatch)

    response = client.post("/update-all", headers=AUTH_HEADERS)

    assert response.status_code == 409
    assert response.get_json()["runId"] == "active"
    assert steps.calls == []


def test_marks_stale_running_rows_failed(client, db, monkeypatch):
    db.cursor().execute(
        """
        INSERT INTO job_runs (id, job, status, started_at)
        VALUES ('crashed', 'update_all', 'running', NOW() - INTERVAL '4 hours')
        """
    )
    Steps().install(monkeypatch)

    response = client.post("/update-all", headers=AUTH_HEADERS)

    assert response.status_code == 200, response.get_json()
    [stale] = fetch_all(db, "SELECT status, error FROM job_runs WHERE id = 'crashed'")
    assert stale == {"status": "failed", "error": "Stale: never finished"}


def test_requires_cron_auth(client):
    assert client.post("/update-all").status_code == 401
    assert client.post("/update-all/resume").status_code == 401
