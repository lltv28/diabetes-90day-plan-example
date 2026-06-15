"""Structural check of plan-template.json against the kodara PlanTemplate schema.

Mirrors the constraints in apps/api/src/services/planTemplate/planTemplate.schema.ts
and planTaskCadence.service.ts. This is a fast stand-in for the real zod parse —
it catches shape errors so the template is drop-in for the actual generator.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MODES = {"exact", "direction"}
METRIC_TYPES = {"numeric", "completion", "rating"}
VALUE_FORMATS = {"number", "currency", "percentage", "multiplier", "weight", "duration", "count"}
CADENCE_TYPES = {"daily", "weekly"}
WEEKDAYS = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
SCHEDULE_TYPES = {"one_time", "daily", "weekly", "monthly"}

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def validate_task(t, where):
    check(isinstance(t.get("title"), str) and t["title"], f"{where}: title required")
    check(isinstance(t.get("cadenceLabel"), str), f"{where}: cadenceLabel required")
    check(t.get("mode") in MODES, f"{where}: mode must be exact|direction")
    check(t.get("actionMode", "agent") in {"manual", "agent"}, f"{where}: bad actionMode")
    st = t.get("scheduleType")
    check(st is None or st in SCHEDULE_TYPES, f"{where}: bad scheduleType {st}")
    for d in t.get("dailyWeekdays") or []:
        check(isinstance(d, int) and 0 <= d <= 6, f"{where}: dailyWeekdays 0-6")
    w = t.get("weeklyDayOfWeek")
    check(w is None or (isinstance(w, int) and 0 <= w <= 6), f"{where}: weeklyDayOfWeek 0-6")
    m = t.get("monthlyDayOfMonth")
    check(m is None or (isinstance(m, int) and 1 <= m <= 31), f"{where}: monthlyDayOfMonth 1-31")
    o = t.get("dueOffsetDays")
    check(o is None or (isinstance(o, int) and o >= 0), f"{where}: dueOffsetDays >= 0")


def validate_metric(m, where):
    check(m.get("type") in METRIC_TYPES, f"{where}: bad type")
    check(m.get("mode") in MODES, f"{where}: mode required")
    vf = m.get("valueFormat")
    check(vf is None or vf in VALUE_FORMATS, f"{where}: bad valueFormat")
    check(m.get("cadenceType") in CADENCE_TYPES, f"{where}: bad cadenceType")
    # validatePlanMetricShape
    if m["cadenceType"] == "weekly":
        check(bool(m.get("weeklyDays")), f"{where}: weekly metric needs weeklyDays")
    if m["cadenceType"] == "daily":
        check(m.get("weeklyDays") is None, f"{where}: daily metric must not set weeklyDays")
    for d in m.get("weeklyDays") or []:
        check(d in WEEKDAYS, f"{where}: bad weekday {d}")
    if m["type"] == "rating":
        check(m.get("targetValue") is None, f"{where}: rating metric has no targetValue")
        check(m.get("direction") is not None, f"{where}: rating metric needs direction")
        check(
            isinstance(m.get("ratingMin"), int) and isinstance(m.get("ratingMax"), int)
            and m["ratingMin"] < m["ratingMax"],
            f"{where}: rating needs ratingMin < ratingMax",
        )
    else:
        check(m.get("ratingMin") is None and m.get("ratingMax") is None,
              f"{where}: only rating metrics set rating bounds")


def main():
    with open(os.path.join(ROOT, "plan-template.json"), encoding="utf-8") as f:
        tpl = json.load(f)

    dw = tpl.get("durationWeeks")
    check(isinstance(dw, int) and 1 <= dw <= 52, "durationWeeks must be 1-52")
    check(re.fullmatch(r"\d{2}:\d{2}", tpl.get("reminderTime", "")), "reminderTime must be HH:MM")
    for d in tpl.get("reminderDays", []):
        check(isinstance(d, int) and 0 <= d <= 6, "reminderDays 0-6")

    metrics = tpl.get("metrics", [])
    check(1 <= len(metrics) <= 2, "metrics must be 1-2")
    for i, m in enumerate(metrics):
        validate_metric(m, f"metric[{i}]")

    check(len(tpl.get("humanTouchpoints", [])) <= 10, "humanTouchpoints max 10")

    phases = tpl.get("phases", [])
    check(1 <= len(phases) <= 6, "phases must be 1-6")
    for pi, p in enumerate(phases):
        check(p.get("mode") in MODES, f"phase[{pi}]: mode required")
        check(isinstance(p.get("title"), str) and p["title"], f"phase[{pi}]: title required")
        ms = p.get("milestones", [])
        check(0 <= len(ms) <= 8, f"phase[{pi}]: milestones 0-8")
        for mi, ms_ in enumerate(ms):
            check(ms_.get("mode") in MODES, f"phase[{pi}].milestone[{mi}]: mode required")
            tasks = ms_.get("tasks", [])
            check(0 <= len(tasks) <= 12, f"phase[{pi}].milestone[{mi}]: tasks 0-12")
            for ti, t in enumerate(tasks):
                validate_task(t, f"phase[{pi}].milestone[{mi}].task[{ti}]")

    if errors:
        print("INVALID — %d issue(s):" % len(errors))
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("VALID — plan-template.json matches PlanTemplate constraints")
    print(f"  phases={len(phases)} metrics={len(metrics)} "
          f"tasks={sum(len(m.get('tasks', [])) for p in phases for m in p.get('milestones', []))}")


if __name__ == "__main__":
    main()
