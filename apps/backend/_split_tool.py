"""One-off: split large modules into packages by moving top-level statements verbatim."""

import ast
import os
import re
import subprocess
import sys

MARKER = re.compile(r"^# --- .*-{5,}\s*$")


def parse(path):
    src = open(path).read()
    lines = src.split("\n")
    tree = ast.parse(src)
    return src, lines, tree


def node_name(n):
    if isinstance(n, (ast.FunctionDef, ast.ClassDef)):
        return n.name
    if isinstance(n, ast.Assign):
        return [t.id for t in n.targets if isinstance(t, ast.Name)][0]
    if isinstance(n, ast.AnnAssign):
        return n.target.id
    raise ValueError(f"Unsupported top-level node {type(n).__name__} at line {n.lineno}")


def split(src_path, pkg, modules, assign, docs, init_text, future=True):
    _, lines, tree = parse(src_path)
    body = list(tree.body)
    if isinstance(body[0], ast.Expr) and isinstance(getattr(body[0], "value", None), ast.Constant):
        body = body[1:]
    imports = []
    while body and isinstance(body[0], (ast.Import, ast.ImportFrom)):
        imports.append(body.pop(0))
    import_lines = []
    for imp in imports:
        if isinstance(imp, ast.ImportFrom) and imp.module == "__future__":
            continue
        import_lines.extend(lines[imp.lineno - 1 : imp.end_lineno])
    import_block = "\n".join(import_lines)

    prev_end = imports[-1].end_lineno
    marker_lines = {i + 1: line for i, line in enumerate(lines) if MARKER.match(line)}
    seg = {m: [] for m in modules}
    names = {m: [] for m in modules}
    for n in body:
        name = node_name(n)
        markers_before = [ln for ln in marker_lines if ln < n.lineno]
        section = marker_lines[max(markers_before)] if markers_before else None
        mod = assign(name, section)
        text = [ln for ln in lines[prev_end : n.end_lineno] if not MARKER.match(ln)]
        seg[mod].append("\n".join(text))
        names[mod].append(name)
        prev_end = n.end_lineno

    pkg_dir = pkg.replace(".", "/")
    os.makedirs(pkg_dir, exist_ok=True)
    written = []
    for mod in modules:
        if not seg[mod]:
            raise SystemExit(f"{pkg}.{mod} has no content")
        sibling_imports = []
        for other in modules:
            if other != mod and names[other]:
                sibling_imports.append(f"from {pkg}.{other} import ({', '.join(names[other])})")
        parts = [f'"""{docs[mod]}"""', ""]
        if future:
            parts += ["from __future__ import annotations", ""]
        parts += [import_block, *sibling_imports, "", "\n".join(seg[mod]).strip("\n"), ""]
        path = f"{pkg_dir}/{mod}.py"
        with open(path, "w") as fh:
            fh.write("\n".join(parts))
        written.append(path)

    with open(f"{pkg_dir}/__init__.py", "w") as fh:
        fh.write(init_text(names))
    os.remove(src_path)

    ruff = os.path.join(os.path.dirname(sys.executable), "ruff")
    subprocess.run([ruff, "check", "--select", "F401", "--fix", "--quiet", *written], check=False)
    return names


def reexport_init(pkg, doc, modules):
    def _render(names):
        out = [f'"""{doc}"""', ""]
        all_names = []
        for mod in modules:
            out.append(f"from {pkg}.{mod} import ({', '.join(names[mod])})")
            all_names += names[mod]
        out += ["", "__all__ = [", *[f'    "{n}",' for n in all_names], "]", ""]
        return "\n".join(out)

    return _render


def blueprint_init(pkg, doc, bp_name, modules):
    def _render(names):
        route_modules = [m for m in modules if m != "blueprint"]
        return "\n".join(
            [
                f'"""{doc}"""',
                "",
                f"from {pkg} import {', '.join(route_modules)}  # noqa: F401  (registers routes)",
                f"from {pkg}.blueprint import {bp_name}",
                "",
                f'__all__ = ["{bp_name}"]',
                "",
            ]
        )

    return _render


SECTION_MODULES = {
    "RESULTADOS": "resultados",
    "RÉCORDS": "records",
    "PRÓXIMAS": "upcoming",
    "RESUMEN ANUAL": "summary_unlock",
    "SEMANA": "weekly_digest",
    "RACHAS": "streaks_monthly",
    "AÑO": "year_recap",
    "MOLLERZ": "mollerz",
    "NÉMESIS": "nemesis",
    "Shared mark": "mark",
}


def section_module(section, default):
    if section is None:
        return default
    for key, mod in SECTION_MODULES.items():
        if section.startswith(f"# --- {key}"):
            return mod
    raise SystemExit(f"Unknown section {section!r}")


POST_TYPES = [
    "resultados",
    "records",
    "upcoming",
    "summary_unlock",
    "weekly_digest",
    "streaks_monthly",
    "year_recap",
    "mollerz",
    "nemesis",
]

POSTER_DOCS = {
    "shared": "Shared helpers for typed social posts: post log, competition lookup, Meta publishing.",
    "resultados": "RESULTADOS posts: competition results now available.",
    "records": "RÉCORDS posts: new NR/NAR/WR results.",
    "upcoming": "PRÓXIMAS posts: newly announced Mexican competitions.",
    "summary_unlock": "RESUMEN posts: yearly summaries unlocked.",
    "weekly_digest": "SEMANA posts: weekly competition digest.",
    "streaks_monthly": "RACHAS posts: monthly PR streak leaderboard.",
    "year_recap": "AÑO posts: year recap carousel (Dec 31).",
    "mollerz": "MOLLERZ posts: new members and tier upgrades.",
    "nemesis": "NÉMESIS posts: nemesis-free competitors.",
    "mark": "Record manual publishes for any typed post (no Meta API call).",
}

ROUTE_DOCS = {
    "blueprint": "Blueprint for social media routes.",
    "media": "Temporary media served to Instagram (image_url fetches).",
    "resultados": "RESULTADOS caption/image/publish/mark routes.",
    "records": "RÉCORDS caption/image/publish/mark routes.",
    "upcoming": "PRÓXIMAS caption/image/publish/mark routes.",
    "summary_unlock": "RESUMEN ANUAL unlock caption/image/publish/mark routes.",
    "weekly_digest": "SEMANA caption/image/slides/publish/mark routes.",
    "streaks_monthly": "RACHAS caption/image/publish/mark routes.",
    "year_recap": "AÑO caption/slides/publish/mark routes.",
    "mollerz": "MOLLERZ caption/image/publish/mark/seed routes.",
    "nemesis": "NÉMESIS caption/image/publish/mark/seed routes.",
}

ADMIN_MODULES = {
    "blueprint": ["admin_bp"],
    "wca_import": [
        "WCA_EXPORT_TIMEOUT",
        "WCA_STAFF_PATTERN",
        "parse_wca_staff",
        "sync_mexican_competition_staff",
        "update_full_database",
        "update_existing_mexican_competitions",
    ],
    "state": [
        "update_state_ranks",
        "REGIONAL_RECORD_MARKERS",
        "_to_date_key",
        "_is_regional_record",
        "_mark_state_records",
        "update_state_records",
    ],
    "schedules": [
        "_fetch_public_wcif",
        "_upsert_round_dates",
        "SCHEDULE_IMPORT_BATCH_SIZE",
        "run_update_competition_schedules",
        "update_competition_schedules",
    ],
    "rankings": [
        "update_sum_of_ranks",
        "update_kinch_ranks",
        "_is_personal_record",
        "_compute_person_streaks",
        "update_streak_ranks",
        "update_nemesis_stats",
    ],
    "social_jobs": [
        "post_summary_unlock_route",
        "post_weekly_digest_route",
        "post_streaks_monthly_route",
        "post_year_recap_route",
    ],
    "update_all": ["update_all"],
}

ADMIN_DOCS = {
    "blueprint": "Blueprint for cron-protected admin update routes.",
    "wca_import": "WCA results export import and Mexican competition sync.",
    "state": "State rankings and state records (SR).",
    "schedules": "Competition round schedules from public WCIF.",
    "rankings": "Derived rankings: sum of ranks, Kinch, PR streaks, nemesis stats.",
    "social_jobs": "Cron endpoints that trigger scheduled social posts.",
    "update_all": "Run every update job in order, then due social posts.",
}


def main():
    poster_modules = ["shared", *POST_TYPES, "mark"]
    split(
        "social/poster.py",
        "social.poster",
        poster_modules,
        lambda name, section: section_module(section, "shared"),
        POSTER_DOCS,
        reexport_init(
            "social.poster",
            "Orchestrate typed social posts: RESULTADOS, RÉCORDS, PRÓXIMAS, RESUMEN, SEMANA, RACHAS, AÑO, "
            "MOLLERZ, NÉMESIS.",
            poster_modules,
        ),
    )

    route_modules = ["blueprint", "media", *POST_TYPES]
    split(
        "routes/social.py",
        "routes.social",
        route_modules,
        lambda name, section: "blueprint" if name == "social_bp" else section_module(section, "media"),
        ROUTE_DOCS,
        blueprint_init(
            "routes.social",
            "Social media routes: temp IG media + typed post publish/download.",
            "social_bp",
            route_modules,
        ),
    )

    by_name = {n: mod for mod, ns in ADMIN_MODULES.items() for n in ns}

    def admin_assign(name, _section):
        if name not in by_name:
            raise SystemExit(f"Unmapped admin name {name}")
        return by_name[name]

    admin_modules = list(ADMIN_MODULES)
    split(
        "routes/admin_updates.py",
        "routes.admin",
        admin_modules,
        admin_assign,
        ADMIN_DOCS,
        blueprint_init("routes.admin", "Cron-protected admin update routes.", "admin_bp", admin_modules),
        future=False,
    )
    with open("routes/admin_updates.py", "w") as fh:
        fh.write(
            '"""Back-compat import path for the admin blueprint."""\n\nfrom routes.admin import admin_bp\n\n__all__ = ["admin_bp"]\n'
        )


if __name__ == "__main__":
    main()
