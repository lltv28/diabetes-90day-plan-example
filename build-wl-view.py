"""Render the white-label client Plans view as a faithful static page.

Reproduces apps/electron/src/pages/Plan.tsx and its cards (WLPlanMetricsPanel,
WLOverallPlanProgressCard, WLPhaseCard, WLTaskRow, NextTasksSection) using the
real Tailwind classes + wl-theme tokens, seeded with the diabetes plan data at a
mid-plan state (Phase 2 "Rebuild", ~week 8). Outputs wl-plans-view/index.html.
"""

import json
import math
import os
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.abspath(__file__))
TODAY_DAY = 54  # day index we render "today" at — mid Phase 2
GLU_TARGET = 95

with open(os.path.join(ROOT, "data", "check-ins.json"), encoding="utf-8") as f:
    checkins = json.load(f)

glu = [c for c in checkins if c["plan_metric_id"] == "metric-fasting-glucose"]
wt = [c for c in checkins if c["plan_metric_id"] == "metric-body-weight"]
glu.sort(key=lambda c: c["check_in_date"])
wt.sort(key=lambda c: c["check_in_date"])

START = date.fromisoformat(glu[0]["check_in_date"])

# ---- actual series up to "today" + projected continuation to day 89 ----
glu_actual = [(i, c["numeric_value"]) for i, c in enumerate(glu) if i <= TODAY_DAY]
glu_current = glu_actual[-1][1]
glu_proj = [(TODAY_DAY, glu_current)]
for day in range(TODAY_DAY + 1, 90):
    glu_proj.append((day, round(GLU_TARGET + (glu_current - GLU_TARGET) * math.exp(-(day - TODAY_DAY) / 18.0))))

wt_actual = [(round((date.fromisoformat(c["check_in_date"]) - START).days), c["numeric_value"])
             for c in wt if (date.fromisoformat(c["check_in_date"]) - START).days <= TODAY_DAY]
wt_current = wt_actual[-1][1]

# weekly deltas (improvement %, direction=decrease) for the stat pill
glu_week_ago = next((v for d, v in glu_actual if d == TODAY_DAY - 7), glu_actual[0][1])
glu_delta = round((glu_week_ago - glu_current) / glu_week_ago * 100)
wt_week_ago = wt_actual[-2][1] if len(wt_actual) > 1 else wt_actual[0][1]
wt_delta = round((wt_week_ago - wt_current) / wt_week_ago * 100)


def fmt_date(day):
    return (START + timedelta(days=day)).strftime("%b %-d") if os.name != "nt" else (START + timedelta(days=day)).strftime("%b %#d")


# ---- area-chart SVG (mirrors the recharts purple actual/projected look) ----
def chart_svg():
    W, H = 680, 288
    L, R, T, B = 56, 24, 92, 26
    pts = glu_actual + glu_proj[1:]
    ys = [v for _, v in pts]
    ymin, ymax = min(ys) - 6, max(ys) + 8
    x0, x1 = L, W - R
    y0, y1 = T, H - B

    def px(day):
        return x0 + (day / 89.0) * (x1 - x0)

    def py(val):
        return y1 - (val - ymin) / (ymax - ymin) * (y1 - y0)

    def path(series):
        return "M " + " L ".join(f"{px(d):.1f} {py(v):.1f}" for d, v in series)

    def area(series):
        d = path(series)
        return f"{d} L {px(series[-1][0]):.1f} {y1:.1f} L {px(series[0][0]):.1f} {y1:.1f} Z"

    # gridlines + y ticks
    grid, yticks = "", ""
    for i in range(4):
        val = ymin + (ymax - ymin) * i / 3
        y = py(val)
        grid += f'<line x1="{L}" y1="{y:.1f}" x2="{x1}" y2="{y:.1f}" stroke="rgba(26,26,26,0.07)" stroke-width="1"/>'
        yticks += f'<text x="{L-10}" y="{y+4:.1f}" text-anchor="end" font-size="12" font-weight="500" fill="rgba(26,26,26,0.6)" font-family="var(--wl-font-family)">{round(val)}</text>'
    # x ticks
    xticks = ""
    for day in (0, 18, 36, 54, 72, 89):
        xticks += f'<text x="{px(day):.1f}" y="{H-6}" text-anchor="middle" font-size="12" font-weight="500" fill="rgba(26,26,26,0.6)" font-family="var(--wl-font-family)">{fmt_date(day)}</text>'

    cx, cy = px(TODAY_DAY), py(glu_current)
    return f'''<svg viewBox="0 0 {W} {H}" width="100%" height="100%" preserveAspectRatio="none" aria-label="Fasting Blood Glucose chart">
  <defs>
    <linearGradient id="wlfill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
    </linearGradient>
  </defs>
  {grid}
  <path d="{area(glu_proj)}" fill="url(#wlfill)" fill-opacity="0.6"/>
  <path d="{area(glu_actual)}" fill="url(#wlfill)"/>
  <path d="{path(glu_proj)}" fill="none" stroke="#818cf8" stroke-width="3" stroke-dasharray="6 8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="{path(glu_actual)}" fill="none" stroke="#818cf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="{cx:.1f}" cy="{cy:.1f}" r="6" fill="white" stroke="#818cf8" stroke-width="4"/>
  {yticks}{xticks}
</svg>'''


# ---- task rows (Phase 2 milestone 1, "Low-glycemic eating") ----
def task_title(text, completed=False, accent=True):
    if completed:
        cls = "text-[14px] font-normal leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.36)] line-through"
        style = "font-family:var(--wl-font-family)"
    else:
        cls = "text-[14px] font-medium leading-5 tracking-[-0.15px]"
        style = "font-family:var(--wl-font-family);color:#008ba7" if accent else "font-family:var(--wl-font-family)"
    return cls, style


def manual_row(text, completed=False, due=None, undo=False):
    cls, style = task_title(text, completed)
    meta = ""
    if undo and completed:
        meta = ('<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium leading-5 tracking-[-0.15px]">'
                '<span class="inline-flex items-center gap-1 text-[14px] font-medium leading-5" style="font-family:var(--wl-font-family);color:#008ba7">'
                '<i data-lucide="pen-line" class="h-4 w-4"></i>Undo</span></div>')
    elif due:
        meta = (f'<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium leading-5 tracking-[-0.15px]">'
                f'<span class="inline-flex items-center gap-1.5" style="font-family:var(--wl-font-family);color:rgba(26,26,26,0.5)">'
                f'<i data-lucide="calendar-days" class="h-[15px] w-[15px]"></i>{due}</span></div>')
    btn = "" if completed else ('<button class="shrink-0 cursor-pointer whitespace-nowrap rounded-[8px] border border-[rgba(26,26,26,0.09)] '
            'bg-gradient-to-b from-[#fafafa] to-[#f5f5f5] px-3 py-1 text-[14px] font-medium leading-5 text-[rgba(26,26,26,0.6)] '
            'hover:from-[#f5f5f5] hover:to-[#ededed] hover:text-[rgba(26,26,26,0.88)]" style="font-family:var(--wl-font-family)">Mark as done</button>')
    return (f'<div class="group flex items-start gap-3 py-3"><div class="min-w-0 flex-1 text-left">'
            f'<div class="{cls}" style="{style}">{text}</div>{meta}</div>{btn}</div>')


def agent_row(text, instr):
    cls, style = task_title(text)
    meta = (f'<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium leading-5 tracking-[-0.15px]">'
            f'<span class="inline-flex items-center gap-1.5" style="font-family:var(--wl-font-family);color:#008ba7">'
            f'<i data-lucide="sparkles" class="h-[14px] w-[14px]"></i>{instr}</span></div>')
    chevron = ('<button class="mt-1 shrink-0 cursor-pointer text-[rgba(26,26,26,0.4)] hover:text-[rgba(26,26,26,0.7)]">'
               '<i data-lucide="chevron-right" class="h-[22px] w-[22px]"></i></button>')
    return (f'<div class="group flex items-start gap-3 py-3 cursor-pointer"><div class="min-w-0 flex-1 text-left">'
            f'<div class="{cls}" style="{style}">{text}</div>{meta}</div>{chevron}</div>')


def checkin_row(text):
    cls, style = task_title(text)
    btn = ('<button class="shrink-0 cursor-pointer rounded-[8px] border border-[rgba(26,26,26,0.09)] '
           'bg-gradient-to-b from-[#fafafa] to-[#f5f5f5] px-3 py-1 text-[14px] font-medium leading-5 tracking-[-0.15px] '
           'text-[rgba(26,26,26,0.6)] hover:from-[#f5f5f5] hover:to-[#ededed] hover:text-[rgba(26,26,26,0.88)]" '
           'style="font-family:var(--wl-font-family)">Check in</button>')
    return (f'<div class="group flex items-start gap-3 py-3 cursor-pointer"><div class="min-w-0 flex-1 text-left">'
            f'<div class="{cls}" style="{style}">{text}</div></div>{btn}</div>')


today_tasks = (
    checkin_row("Check in: Fasting Blood Glucose")
    + agent_row("Build each plate: protein + fiber + healthy fat, eat carbs last",
                "Suggest a protein-first dinner")
    + manual_row("Eat within a 10-hour window (time-restricted eating)")
    + manual_row("Continue logging fasting blood glucose each morning", completed=True, undo=True)
)
upcoming_tasks = (
    manual_row("20-minute resistance / bodyweight strength session", due="Tomorrow")
    + agent_row("Grocery shop from the approved staples list", "Build this week's grocery list")
)

OVERALL_PCT = 52
PHASE_PCT = 46
GREET = "Hey Maria, here is your plan progress"

HTML = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Plans — White-Label Client View (Example)</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<style>
  :root {{
    --wl-font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --wl-bg-sidebar: rgba(0,180,212,0.05);
  }}
  body {{ margin:0; background:#f6f8f9; font-family: var(--wl-font-family); }}
  .wl-shell {{ display:flex; min-height:100vh; }}
  .wl-side {{ width:240px; flex-shrink:0; background:var(--wl-bg-sidebar); border-right:1px solid rgba(26,26,26,0.06); padding:20px 14px; }}
  .wl-side .brand {{ display:flex; align-items:center; gap:10px; font-weight:600; color:rgba(26,26,26,0.82); font-size:15px; margin-bottom:24px; }}
  .wl-side .logo {{ width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,#b7f1ff,#00b4d4); }}
  .wl-nav a {{ display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; font-size:14px; color:rgba(26,26,26,0.6); text-decoration:none; margin-bottom:2px; }}
  .wl-nav a.active {{ background:rgba(0,175,208,0.06); color:#008ba7; font-weight:500; }}
  @media (max-width: 880px) {{ .wl-side {{ display:none; }} }}
</style>
</head>
<body>
<div class="wl-shell">
  <aside class="wl-side">
    <div class="brand"><span class="logo"></span> Thrive Health</div>
    <nav class="wl-nav">
      <a href="#"><i data-lucide="message-circle" style="width:16px;height:16px"></i> Chat</a>
      <a href="#" class="active"><i data-lucide="list-checks" style="width:16px;height:16px"></i> Plan</a>
      <a href="#"><i data-lucide="folder" style="width:16px;height:16px"></i> Library</a>
      <a href="#"><i data-lucide="settings" style="width:16px;height:16px"></i> Settings</a>
    </nav>
  </aside>

  <div class="flex-1 min-h-0 overflow-y-auto">
    <div class="mx-auto w-full max-w-[800px] px-6 py-8">
      <main class="min-w-0 space-y-6">

        <!-- WLPlanMetricsPanel -->
        <section class="space-y-2" aria-label="Metrics">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[16px] font-normal leading-6 tracking-[-0.5px] text-black" style="font-family:var(--wl-font-family)">Impact overtime</h2>
          </div>
          <div class="grid grid-cols-4 gap-2" role="tablist" aria-label="Metric charts">
            <button class="col-span-2 h-[88px] cursor-pointer flex flex-col justify-center gap-0 rounded-[16px] border border-[rgba(26,26,26,0.18)] bg-[#fafafa] p-4 text-left" style="font-family:var(--wl-font-family)">
              <span class="block truncate text-[12px] font-medium leading-4 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]">Fasting Blood Glucose</span>
              <span class="block truncate text-[32px] font-normal leading-10 tracking-[-0.5px] text-[rgba(26,26,26,0.8)]">{glu_current}</span>
            </button>
            <button class="col-span-2 h-[88px] cursor-pointer flex flex-col justify-center gap-0 rounded-[16px] border border-[rgba(26,26,26,0.09)] bg-[#fafafa] p-4 text-left hover:border-[rgba(26,26,26,0.14)]" style="font-family:var(--wl-font-family)">
              <span class="block truncate text-[12px] font-medium leading-4 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]">Body Weight</span>
              <span class="block truncate text-[32px] font-normal leading-10 tracking-[-0.5px] text-[rgba(26,26,26,0.8)]">{wt_current} lb</span>
            </button>
          </div>

          <div class="relative aspect-[680/288] min-h-[260px] w-full overflow-hidden rounded-[20px] border border-[rgba(26,26,26,0.09)] bg-[#fafafa]">
            <div class="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-5">
              <div class="flex flex-col gap-0.5">
                <span class="text-[12px] font-medium leading-4 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]" style="font-family:var(--wl-font-family)">Current</span>
                <div class="flex items-center gap-2">
                  <span class="text-[16px] font-medium leading-6 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]" style="font-family:var(--wl-font-family)">{glu_current} mg/dL</span>
                  <span class="inline-flex items-center gap-0.5 rounded-full py-0.5 pl-1 pr-1.5 bg-[rgba(16,104,68,0.06)]" style="font-family:var(--wl-font-family)">
                    <i data-lucide="trending-up" class="size-4 text-[rgba(16,104,68,0.92)]"></i>
                    <span class="text-[12px] font-medium leading-4 tracking-[-0.15px] text-[rgba(16,104,68,0.92)]">{abs(glu_delta)}%</span>
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1.5"><span class="block h-px w-6 border-t border-dashed" style="border-top-color:#818cf8"></span>
                  <span class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]" style="font-family:var(--wl-font-family)">Projected</span></div>
                <div class="flex items-center gap-1.5"><span class="block h-0.5 w-6 rounded-full" style="background:#818cf8"></span>
                  <span class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]" style="font-family:var(--wl-font-family)">Actual</span></div>
              </div>
            </div>
            {chart_svg()}
          </div>
        </section>

        <!-- greeting header -->
        <header class="flex items-center justify-between gap-3">
          <h1 class="text-[16px] font-normal leading-6 tracking-[-0.5px] text-black" style="font-family:var(--wl-font-family)">{GREET}</h1>
          <button class="shrink-0 text-[14px] font-medium leading-5 text-[#008ba7] hover:text-[#006f89] cursor-pointer" style="font-family:var(--wl-font-family)">See all plan</button>
        </header>

        <!-- WLOverallPlanProgressCard -->
        <section aria-label="Overall plan progress" class="rounded-[24px] border border-[rgba(26,26,26,0.09)] bg-white px-5 py-5" style="font-family:var(--wl-font-family)">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]">Overall plan progress</h2>
            <div class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]">{OVERALL_PCT}%</div>
          </div>
          <div class="mt-4 h-[10px] overflow-hidden rounded-full bg-[rgba(16,104,68,0.08)] shadow-[inset_0_0_1px_rgba(26,26,26,0.16)]">
            <div class="h-full rounded-full bg-gradient-to-r from-[#18c280] to-[#108844] shadow-[inset_0_-1px_3px_rgba(26,26,26,0.18)]" style="width:{OVERALL_PCT}%"></div>
          </div>
          <div class="mt-4 flex flex-col gap-2 leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.6)] md:flex-row md:items-center md:justify-between">
            <div class="text-[14px] font-normal">You have done 1 phase and 23 tasks</div>
            <div class="inline-flex items-center gap-2 text-[14px] font-medium text-[rgba(26,26,26,0.6)]">
              <i data-lucide="star" class="h-4 w-4 shrink-0" style="fill:rgba(26,26,26,0.6)"></i>
              <span>Finish today's task to boost by 2%.</span>
            </div>
          </div>
        </section>

        <!-- WLPhaseCard -->
        <section aria-label="Current phase" class="rounded-[20px] border border-[rgba(26,26,26,0.09)] bg-white px-5 py-5" style="font-family:var(--wl-font-family)">
          <div class="flex items-start gap-4">
            <div class="min-w-0 flex-1">
              <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[12px] font-medium leading-4 tracking-[-0.15px]" style="font-family:var(--wl-font-family);background:rgba(0,175,208,0.06);color:#008ba7">Phase</span>
              <h2 class="mt-2 text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]">Phase 2 — Rebuild</h2>
              <p class="mt-0.5 text-[14px] font-normal leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]">Now that the spikes are under control, build metabolic flexibility: low-glycemic plates, a 10-hour eating window, strength + zone-2 cardio, and the sleep and stress habits that quietly drive insulin resistance.</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <div class="inline-flex items-center gap-1 rounded-full bg-[rgba(16,104,68,0.06)] px-2.5 py-1 text-[12px] font-medium leading-4 text-[rgba(16,104,68,0.92)]">
                <i data-lucide="rocket" class="h-3.5 w-3.5"></i>{PHASE_PCT}% Completed</div>
              <button class="cursor-pointer rounded-full bg-[rgba(26,26,26,0.04)] p-0.5 text-[rgba(26,26,26,0.6)] hover:bg-[rgba(26,26,26,0.08)]"><i data-lucide="chevron-up" class="h-4 w-4"></i></button>
            </div>
          </div>
          <div class="mt-4 h-[6px] overflow-hidden rounded-full bg-[rgba(26,26,26,0.06)]">
            <div class="h-full rounded-full bg-gradient-to-r from-[#16a46c] to-[#108844]" style="width:{PHASE_PCT}%"></div>
          </div>

          <div class="mt-6">
            <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[12px] font-medium leading-4 tracking-[-0.15px]" style="font-family:var(--wl-font-family);background:#fffbeb;color:#92400e">Milestone</span>
            <div class="mt-2 flex w-full items-start gap-2 text-left">
              <div class="min-w-0 flex-1">
                <div class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]">Low-glycemic eating</div>
                <p class="mt-0.5 text-[14px] font-normal leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]">Make every plate blood-sugar friendly and tighten the eating window.</p>
              </div>
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(26,26,26,0.04)] text-[rgba(26,26,26,0.6)]"><i data-lucide="chevron-up" class="h-4 w-4"></i></span>
            </div>
          </div>

          <div class="mt-5">
            <div class="space-y-5">
              <div>
                <div class="mb-1 text-[10px] font-semibold uppercase leading-4 tracking-[0.8px] text-[rgba(26,26,26,0.6)]">TODAY</div>
                <div>{today_tasks}</div>
              </div>
              <div>
                <div class="mb-1 text-[10px] font-semibold uppercase leading-4 tracking-[0.8px] text-[rgba(26,26,26,0.6)]">UPCOMING</div>
                <div>{upcoming_tasks}</div>
              </div>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <div class="border-t border-[rgba(26,26,26,0.08)] pt-6">
              <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[12px] font-medium leading-4 tracking-[-0.15px]" style="font-family:var(--wl-font-family);background:rgba(0,175,208,0.06);color:#008ba7">Milestone</span>
              <div class="mt-2 flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]">Strength + zone-2 cardio</div>
                  <p class="mt-0.5 text-[14px] font-normal leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]">Muscle is a glucose sink. Alternate resistance work with easy aerobic days.</p>
                </div>
              </div>
            </div>
            <div class="border-t border-[rgba(26,26,26,0.08)] pt-6">
              <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[12px] font-medium leading-4 tracking-[-0.15px]" style="font-family:var(--wl-font-family);background:rgba(0,175,208,0.06);color:#008ba7">Milestone</span>
              <div class="mt-2 flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]">Sleep &amp; stress</div>
                  <p class="mt-0.5 text-[14px] font-normal leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.6)]">Protect sleep and downshift stress — both raise fasting glucose when neglected.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- WLCompletedPhasesSection (Phase 1 done) -->
        <section aria-label="Completed phases" class="rounded-[20px] border border-[rgba(26,26,26,0.09)] bg-white px-5 py-4" style="font-family:var(--wl-font-family)">
          <div class="flex items-center gap-3">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(16,104,68,0.1)] text-[rgba(16,104,68,0.92)]"><i data-lucide="check" class="h-4 w-4"></i></span>
            <div class="min-w-0 flex-1">
              <div class="text-[14px] font-medium leading-5 tracking-[-0.15px] text-[rgba(26,26,26,0.8)]">Phase 1 — Stabilize</div>
              <div class="text-[12px] font-normal leading-4 text-[rgba(26,26,26,0.5)]">Completed · 8 tasks</div>
            </div>
            <span class="text-[12px] font-medium text-[rgba(16,104,68,0.92)]">100%</span>
          </div>
        </section>

      </main>
    </div>
  </div>
</div>
<script>lucide.createIcons();</script>
</body>
</html>'''

os.makedirs(os.path.join(ROOT, "wl-plans-view"), exist_ok=True)
with open(os.path.join(ROOT, "wl-plans-view", "index.html"), "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"today=day{TODAY_DAY} ({(START + timedelta(days=TODAY_DAY)).isoformat()})")
print(f"glucose current={glu_current} (delta {glu_delta}%), weight={wt_current} (delta {wt_delta}%)")
print(f"actual glucose points={len(glu_actual)}, projected={len(glu_proj)-1}")
print("wrote wl-plans-view/index.html")
