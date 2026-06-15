"""Generate 90 days of example metric check-ins for the diabetes-reversal plan.

Models a realistic type-2-diabetes reversal: fasting glucose falls from the
diabetic range (~168 mg/dL) into the normal range (~95 mg/dL) on an exponential
approach with day-to-day noise, weekend bumps, and a few social-event spikes.
Weight is logged weekly (Monday) and trends down more slowly.

Outputs (all regenerated deterministically; seed is fixed):
  data/fasting-glucose.csv   date,value,note
  data/body-weight.csv       date,value,note
  data/check-ins.json        rows in the client_plan_metric_check_ins shape
  viewer/index.html          single-file Chart.js view of the 90-day progression
"""

import json
import math
import os
import random
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.abspath(__file__))
random.seed(42)

# Anchor the program to a Monday so weekly weigh-ins land cleanly.
START = date(2026, 3, 16)
START -= timedelta(days=START.weekday())  # Monday=0 -> snap back to Monday
DAYS = 90

GLU_METRIC_ID = "metric-fasting-glucose"
WT_METRIC_ID = "metric-body-weight"
GLU_TARGET = 95
DIABETES_FASTING_THRESHOLD = 126  # >=126 mg/dL fasting = diabetic range
NORMAL_FASTING_CEILING = 100      # <100 mg/dL fasting = normal range

# Days (0-indexed) with a real-life glucose spike, and why.
GLUCOSE_EVENT_NOTES = {
    0: "Baseline reading before any changes.",
    12: "Birthday dinner — slept on it, back on plan tomorrow.",
    33: "Weekend trip, ate out twice.",
    58: "Holiday cookout.",
    89: "End-of-program reading.",
}


def fasting_glucose(day: int) -> int:
    start_v, end_v, tau = 168.0, 95.0, 26.0
    base = end_v + (start_v - end_v) * math.exp(-day / tau)
    d = START + timedelta(days=day)
    weekend_bump = 5.0 if d.weekday() >= 5 else 0.0  # Sat/Sun slightly higher
    noise = random.gauss(0, 4.0)
    spike = {12: 19, 33: 15, 58: 13}.get(day, 0)
    return max(82, round(base + weekend_bump + noise + spike))


def body_weight(day: int) -> float:
    start_v, end_v, tau = 214.0, 188.0, 34.0
    base = end_v + (start_v - end_v) * math.exp(-day / tau)
    return round(base + random.gauss(0, 0.5), 1)


def est_a1c(avg_glucose: float) -> float:
    # ADAG estimated-average-glucose -> A1c. Illustrative only.
    return round((avg_glucose + 46.7) / 28.7, 1)


def iso(d: date, clock: str) -> str:
    # expected_at is UTC-anchored, mirroring the current engine behavior.
    return f"{d.isoformat()}T{clock}.000Z"


def main() -> None:
    glucose_rows = []
    weight_rows = []
    checkins = []

    for day in range(DAYS):
        d = START + timedelta(days=day)
        value = fasting_glucose(day)
        note = GLUCOSE_EVENT_NOTES.get(day, "")
        glucose_rows.append((d.isoformat(), value, note))
        checkins.append({
            "plan_metric_id": GLU_METRIC_ID,
            "metric_label": "Fasting Blood Glucose",
            "metric_type": "numeric",
            "check_in_date": d.isoformat(),
            "expected_at": iso(d, "08:00:00"),
            "submitted_at": iso(d, "07:52:00"),
            "status": "submitted",
            "numeric_value": value,
            "completion_value": None,
            "note": note or None,
        })

    # Weekly weigh-ins land on Mondays (program starts on a Monday).
    for day in range(0, DAYS, 7):
        d = START + timedelta(days=day)
        value = body_weight(day)
        note = "Baseline." if day == 0 else ""
        weight_rows.append((d.isoformat(), value, note))
        checkins.append({
            "plan_metric_id": WT_METRIC_ID,
            "metric_label": "Body Weight",
            "metric_type": "numeric",
            "check_in_date": d.isoformat(),
            "expected_at": iso(d, "08:00:00"),
            "submitted_at": iso(d, "08:06:00"),
            "status": "submitted",
            "numeric_value": value,
            "completion_value": None,
            "note": note or None,
        })

    _write_csv(os.path.join(ROOT, "data", "fasting-glucose.csv"), ("date", "value_mg_dl", "note"), glucose_rows)
    _write_csv(os.path.join(ROOT, "data", "body-weight.csv"), ("date", "value_lbs", "note"), weight_rows)

    with open(os.path.join(ROOT, "data", "check-ins.json"), "w", encoding="utf-8") as f:
        json.dump(checkins, f, indent=2)
        f.write("\n")

    summary = _summary(glucose_rows, weight_rows)
    _write_viewer(glucose_rows, weight_rows, summary)
    print(json.dumps(summary, indent=2))


def _summary(glucose_rows, weight_rows):
    first_week_glu = [v for _, v, _ in glucose_rows[:7]]
    last_week_glu = [v for _, v, _ in glucose_rows[-7:]]
    start_avg = sum(first_week_glu) / len(first_week_glu)
    end_avg = sum(last_week_glu) / len(last_week_glu)
    return {
        "glucose_start_avg": round(start_avg),
        "glucose_end_avg": round(end_avg),
        "glucose_drop": round(start_avg - end_avg),
        "est_a1c_start": est_a1c(start_avg),
        "est_a1c_end": est_a1c(end_avg),
        "weight_start": weight_rows[0][1],
        "weight_end": weight_rows[-1][1],
        "weight_lost": round(weight_rows[0][1] - weight_rows[-1][1], 1),
    }


def _write_csv(path, header, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(",".join(header) + "\n")
        for r in rows:
            cells = [str(c).replace(",", ";") for c in r]
            f.write(",".join(cells) + "\n")


def _write_viewer(glucose_rows, weight_rows, summary):
    labels = [d for d, _, _ in glucose_rows]
    glucose = [v for _, v, _ in glucose_rows]
    weight_by_date = {d: v for d, v, _ in weight_rows}
    weight = [weight_by_date.get(d) for d in labels]  # None except weigh-in days

    data = {
        "labels": labels,
        "glucose": glucose,
        "weight": weight,
        "target": [GLU_TARGET] * len(labels),
        "diabetic": [DIABETES_FASTING_THRESHOLD] * len(labels),
        "normal": [NORMAL_FASTING_CEILING] * len(labels),
        "summary": summary,
    }

    html = _VIEWER_TEMPLATE.replace("__DATA__", json.dumps(data))
    with open(os.path.join(ROOT, "viewer", "index.html"), "w", encoding="utf-8") as f:
        f.write(html)


_VIEWER_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>90-Day Blood Sugar Reset — Example Progression</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #11261f; background: #f4f7f5; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  p.sub { margin: 0 0 24px; color: #5b6f66; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 28px; }
  .card { background: #fff; border: 1px solid #e2eae6; border-radius: 12px; padding: 16px; }
  .card .label { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #7c8d85; }
  .card .value { font-size: 26px; font-weight: 700; margin-top: 4px; }
  .card .delta { font-size: 13px; color: #1f8a5b; margin-top: 2px; }
  .chart-box { background: #fff; border: 1px solid #e2eae6; border-radius: 12px; padding: 20px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>90-Day Blood Sugar Reset — Example Client Progression</h1>
  <p class="sub">Dr. Reyes metabolic-health program. Sample data, illustrative only — not medical advice.</p>
  <div class="cards" id="cards"></div>
  <div class="chart-box"><canvas id="chart" height="160"></canvas></div>
</div>
<script>
const D = __DATA__;
const s = D.summary;
document.getElementById('cards').innerHTML = [
  ['Fasting glucose', s.glucose_start_avg + ' &rarr; ' + s.glucose_end_avg + ' mg/dL', '↓ ' + s.glucose_drop + ' mg/dL'],
  ['Est. HbA1c', s.est_a1c_start + '% &rarr; ' + s.est_a1c_end + '%', 'diabetic → normal'],
  ['Body weight', s.weight_start + ' &rarr; ' + s.weight_end + ' lbs', '↓ ' + s.weight_lost + ' lbs'],
  ['Duration', '90 days', '13 weeks, 3 phases'],
].map(c => '<div class="card"><div class="label">' + c[0] + '</div><div class="value">' + c[1] + '</div><div class="delta">' + c[2] + '</div></div>').join('');

new Chart(document.getElementById('chart'), {
  type: 'line',
  data: {
    labels: D.labels,
    datasets: [
      { label: 'Fasting glucose (mg/dL)', data: D.glucose, yAxisID: 'y', borderColor: '#1f8a5b', backgroundColor: 'rgba(31,138,91,.08)', borderWidth: 2, pointRadius: 0, tension: .3, fill: true },
      { label: 'Body weight (lbs)', data: D.weight, yAxisID: 'y1', borderColor: '#c8791b', borderWidth: 2, pointRadius: 3, spanGaps: true, tension: .3 },
      { label: 'Diabetic threshold (126)', data: D.diabetic, yAxisID: 'y', borderColor: '#d34b4b', borderWidth: 1, borderDash: [6,4], pointRadius: 0 },
      { label: 'Normal ceiling (100)', data: D.normal, yAxisID: 'y', borderColor: '#9aa7a1', borderWidth: 1, borderDash: [3,3], pointRadius: 0 },
      { label: 'Target (95)', data: D.target, yAxisID: 'y', borderColor: '#2f7d5b', borderWidth: 1, borderDash: [2,4], pointRadius: 0 },
    ]
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ticks: { maxTicksLimit: 13, autoSkip: true }, grid: { display: false } },
      y: { title: { display: true, text: 'Fasting glucose (mg/dL)' }, suggestedMin: 80, suggestedMax: 180 },
      y1: { position: 'right', title: { display: true, text: 'Weight (lbs)' }, grid: { drawOnChartArea: false }, suggestedMin: 180, suggestedMax: 218 },
    },
    plugins: { legend: { labels: { boxWidth: 18 } } }
  }
});
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
