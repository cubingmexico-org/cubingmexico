import json

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


def _insert_crashed_run(db, started_hours_ago):
    crashed_steps = [
        {"name": "first", "status": "succeeded", "startedAt": None, "finishedAt": None},
        {"name": "second", "status": "running", "startedAt": None, "finishedAt": None},
        {"name": "third", "status": "pending", "startedAt": None, "finishedAt": None},
        {"name": "fourth", "status": "pending", "startedAt": None, "finishedAt": None},
        {"name": "optional", "status": "pending", "startedAt": None, "finishedAt": None},
    ]
    db.cursor().execute(
        """
        INSERT INTO job_runs (id, job, status, steps, started_at)
        VALUES ('crashed', 'update_all', 'running', %s, NOW() - make_interval(hours => %s))
        """,
        (json.dumps(crashed_steps), started_hours_ago),
    )


def test_resume_continues_a_crashed_run_from_the_step_that_was_running(client, db, monkeypatch):
    _insert_crashed_run(db, started_hours_ago=4)
    steps = Steps()
    steps.install(monkeypatch)

    response = client.post("/update-all/resume", headers=AUTH_HEADERS)

    assert response.status_code == 200, response.get_json()
    assert steps.calls == ["second", "third", "fourth", "optional"]
    crashed, resumed = _runs(db)
    assert crashed["status"] == "failed"
    assert crashed["error"] == "Stale: never finished"
    assert resumed["resumed_from"] == "crashed"


def test_resume_rejects_while_a_recent_run_is_still_running(client, db, monkeypatch):
    _insert_crashed_run(db, started_hours_ago=1)
    steps = Steps()
    steps.install(monkeypatch)

    response = client.post("/update-all/resume", headers=AUTH_HEADERS)

    assert response.status_code == 409
    assert response.get_json()["runId"] == "crashed"
    assert steps.calls == []


def test_interrupted_run_is_marked_failed_and_resumable(client, db, monkeypatch):
    steps = Steps()
    steps.install(monkeypatch)
    names = [name for name, _, _ in update_all_module.UPDATE_ALL_STEPS]

    def interrupted():
        raise SystemExit(143)

    monkeypatch.setattr(
        update_all_module,
        "UPDATE_ALL_STEPS",
        [(name, interrupted if name == "second" else steps.step(name), name != "optional") for name in names],
    )

    with pytest.raises(SystemExit):
        update_all_module.run_update_all()

    [run] = _runs(db)
    assert run["status"] == "failed"
    assert run["error"] == "Interrupted during second"
    assert _statuses(run)["second"] == "failed"

    resumed = Steps()
    resumed.install(monkeypatch)
    assert client.post("/update-all/resume", headers=AUTH_HEADERS).status_code == 200
    assert resumed.calls == ["second", "third", "fourth", "optional"]


class FakeJob:
    def __init__(self):
        self.calls = []

    def __call__(self, job_name, args):
        self.calls.append((job_name, args))
        return f"{job_name}/executions/exec-1"


@pytest.fixture
def fake_job(monkeypatch):
    job = FakeJob()
    monkeypatch.setattr(update_all_module, "UPDATE_ALL_JOB", "projects/p/locations/r/jobs/update-all")
    monkeypatch.setattr(update_all_module, "run_job", job)
    return job


def test_with_a_cloud_run_job_update_all_starts_an_execution(client, db, monkeypatch, fake_job):
    steps = Steps()
    steps.install(monkeypatch)

    response = client.post("/update-all", headers=AUTH_HEADERS)

    assert response.status_code == 202, response.get_json()
    assert response.get_json()["execution"] == "projects/p/locations/r/jobs/update-all/executions/exec-1"
    assert fake_job.calls == [("projects/p/locations/r/jobs/update-all", ["update-all"])]
    assert steps.calls == []
    assert _runs(db) == []


def test_with_a_cloud_run_job_resume_starts_a_resume_execution(client, monkeypatch, fake_job):
    Steps(fail={"third"}).install(monkeypatch)
    update_all_module.run_update_all()

    response = client.post("/update-all/resume", headers=AUTH_HEADERS)

    assert response.status_code == 202, response.get_json()
    assert fake_job.calls == [("projects/p/locations/r/jobs/update-all", ["update-all", "--resume"])]


def test_with_a_cloud_run_job_nothing_starts_while_a_run_is_running(client, db, fake_job):
    db.cursor().execute(
        "INSERT INTO job_runs (id, job, status, started_at) VALUES ('active', 'update_all', 'running', NOW())"
    )

    assert client.post("/update-all", headers=AUTH_HEADERS).status_code == 409
    assert client.post("/update-all/resume", headers=AUTH_HEADERS).status_code == 409
    assert fake_job.calls == []


def test_with_a_cloud_run_job_resume_needs_a_failed_run(client, fake_job):
    assert client.post("/update-all/resume", headers=AUTH_HEADERS).status_code == 404
    assert fake_job.calls == []


@pytest.mark.parametrize(("fail", "exit_code"), [((), 0), ({"third"}, 1)])
def test_run_job_cli_exit_code(db, monkeypatch, fail, exit_code):
    import run_job

    Steps(fail=fail).install(monkeypatch)

    assert run_job.main(["update-all"]) == exit_code
    [run] = _runs(db)
    assert run["status"] == ("succeeded" if exit_code == 0 else "failed")


def test_run_job_cli_resumes(db, monkeypatch):
    import run_job

    Steps(fail={"third"}).install(monkeypatch)
    assert run_job.main(["update-all"]) == 1

    steps = Steps()
    steps.install(monkeypatch)
    assert run_job.main(["update-all", "--resume"]) == 0
    assert steps.calls == ["third", "fourth", "optional"]


def test_failed_runs_send_a_notification_and_successful_ones_do_not(client, monkeypatch):
    sent = []
    monkeypatch.setattr(update_all_module.job_runs, "notify_job_failure", lambda *args: sent.append(args))

    Steps().install(monkeypatch)
    client.post("/update-all", headers=AUTH_HEADERS)
    assert sent == []

    Steps(fail={"third"}).install(monkeypatch)
    response = client.post("/update-all", headers=AUTH_HEADERS)

    [(job, run_id, steps, error)] = sent
    assert job == "update_all"
    assert run_id == response.get_json()["runId"]
    assert error == "Error occurred during third"
    assert [step["status"] for step in steps][:3] == ["succeeded", "succeeded", "failed"]


def test_requires_cron_auth(client):
    assert client.post("/update-all").status_code == 401
    assert client.post("/update-all/resume").status_code == 401
