// Builds a WLActivePlan-shaped object from the diabetes plan template + a
// realistic 54-day-in progression, relative to `now`. The real progress math
// (lib/plans/*) runs on this, so the percentages on screen are genuinely computed.
import template from '../../plan-template.json';

/* eslint-disable @typescript-eslint/no-explicit-any */

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function iso(d: Date) {
  return new Date(`${localDate(d)}T12:00:00.000Z`).toISOString();
}
function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

const ELAPSED_DAYS = 54; // mid Phase 2

type CheckIn = {
  id: string;
  checkInDate: string;
  expectedAt: string;
  submittedAt: string;
  numericValue: number | null;
  completionValue: boolean | null;
  note: string | null;
};

function buildGeneratedPlan() {
  const t = template as any;
  return {
    durationWeeks: t.durationWeeks,
    reminderTime: t.reminderTime,
    phases: t.phases.map((phase: any, i: number) => ({
      id: `phase-${i + 1}`,
      title: phase.title,
      description: phase.description,
      // durationDays intentionally omitted: keeps progress on the per-task model
      // (one materialized row per source task) so the demo numbers stay legible.
      milestones: phase.milestones.map((m: any, j: number) => ({
        id: `p${i + 1}-m${j + 1}`,
        title: m.title,
        summary: m.summary,
        tasks: m.tasks.map((task: any, k: number) => ({
          id: `p${i + 1}-m${j + 1}-t${k + 1}`,
          title: task.title,
          scheduleType: task.scheduleType,
          dailyWeekdays: task.dailyWeekdays ?? null,
          actionMode: task.actionMode ?? 'manual',
          actionPrompt: task.actionPrompt ?? null,
          cadenceLabel: task.cadenceLabel,
        })),
      })),
    })),
    metrics: [],
  };
}

function glucoseSeries(now: Date): CheckIn[] {
  const rows: CheckIn[] = [];
  for (let k = 0; k < ELAPSED_DAYS; k++) {
    const d = addDays(now, -(ELAPSED_DAYS - k)); // oldest -> yesterday
    const base = 95 + (168 - 95) * Math.exp(-k / 26);
    // keep the last few days clean so the latest-vs-previous delta reflects the
    // real downtrend instead of daily noise
    const tail = k >= ELAPSED_DAYS - 3;
    const noise = tail ? 0 : Math.round(3 * Math.sin(k * 1.7));
    const weekend = !tail && (d.getDay() === 0 || d.getDay() === 6) ? 4 : 0;
    rows.push({
      id: `glu-${k}`,
      checkInDate: localDate(d),
      expectedAt: iso(d),
      submittedAt: iso(d),
      numericValue: Math.max(90, Math.round(base + noise + weekend)),
      completionValue: null,
      note: null,
    });
  }
  return rows;
}

function weightSeries(now: Date): CheckIn[] {
  const rows: CheckIn[] = [];
  for (let w = 0; w < 8; w++) {
    const d = addDays(now, -7 * (7 - w)); // oldest -> this week
    const base = 188 + (214 - 188) * Math.exp(-w / 3.2);
    rows.push({
      id: `wt-${w}`,
      checkInDate: localDate(d),
      expectedAt: iso(d),
      submittedAt: iso(d),
      numericValue: Math.round((base + Math.sin(w) * 0.4) * 10) / 10,
      completionValue: null,
      note: null,
    });
  }
  return rows;
}

function metricFrom(
  metricId: string,
  label: string,
  valueFormat: string,
  targetValue: string,
  cadenceType: 'daily' | 'weekly',
  weeklyDays: string[] | null,
  series: CheckIn[],
  nextPendingId: string | null,
) {
  const sorted = [...series].sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
  return {
    metricId,
    label,
    type: 'numeric' as const,
    valueFormat,
    direction: 'decrease' as const,
    targetValue,
    ratingMin: null,
    ratingMax: null,
    cadenceType,
    weeklyDays,
    latestSubmittedCheckIn: sorted[0] ?? null,
    previousSubmittedCheckIn: sorted[1] ?? null,
    recentSubmittedCheckIns: sorted,
    nextPendingCheckIn: nextPendingId ? { id: nextPendingId, checkInDate: localDate(new Date()), expectedAt: iso(new Date()) } : null,
  };
}

function makeTask(over: Record<string, any>) {
  return {
    owner: null,
    cadenceLabel: 'Daily',
    actionMode: 'manual',
    actionTitle: null,
    actionPrompt: null,
    chatId: null,
    chatInstructions: null,
    taskInstanceIndex: 0,
    isCurrentInstance: true,
    metricCheckInId: null,
    sourceTaskId: null,
    ...over,
  };
}

export function buildPlan(now = new Date()) {
  const generatedPlan = buildGeneratedPlan();
  const glu = glucoseSeries(now);
  const wt = weightSeries(now);

  const tasks: any[] = [];
  let sort = 0;

  // Phase 1 — fully completed (one completed row per source task -> 100%).
  const p1 = generatedPlan.phases[0];
  for (const m of p1.milestones) {
    for (const task of m.tasks) {
      tasks.push(
        makeTask({
          id: `row-${task.id}`,
          taskType: 'plan_task',
          planPhaseId: p1.id,
          planMilestoneId: m.id,
          sourceTaskId: task.id,
          title: task.title,
          cadenceLabel: task.cadenceLabel,
          actionMode: task.actionMode,
          actionPrompt: task.actionPrompt,
          status: 'completed',
          completedAt: iso(addDays(now, -40)),
          dueAt: iso(addDays(now, -40)),
          sortOrder: sort++,
        }),
      );
    }
  }

  // Phase 2 — current. Per-milestone completion drives a real ~50% phase bar.
  const p2 = generatedPlan.phases[1];
  // completed source-task count per milestone index: m1 -> 1/3, m2 -> 1/2, m3 -> 2/3
  const completedPerMilestone = [1, 1, 2];
  p2.milestones.forEach((m: any, mi: number) => {
    m.tasks.forEach((task: any, ti: number) => {
      const completed = ti < (completedPerMilestone[mi] ?? 0);
      const isFirstMilestone = mi === 0;
      // In the visible milestone, stagger due dates so TODAY/TOMORROW groups show.
      const dueAt = completed
        ? iso(now)
        : isFirstMilestone && ti === 1
          ? iso(addDays(now, 1)) // one upcoming
          : iso(now);
      tasks.push(
        makeTask({
          id: `row-${task.id}`,
          taskType: 'plan_task',
          planPhaseId: p2.id,
          planMilestoneId: m.id,
          sourceTaskId: task.id,
          title: task.title,
          cadenceLabel: task.cadenceLabel,
          actionMode: task.actionMode,
          actionPrompt: task.actionPrompt,
          status: completed ? 'completed' : 'pending',
          completedAt: completed ? iso(now) : null,
          dueAt,
          sortOrder: sort++,
        }),
      );
    });
  });

  // Today's glucose check-in task (drives the "Check in" button + TODAY group).
  tasks.push(
    makeTask({
      id: 'row-glu-checkin',
      taskType: 'metric_check_in',
      planPhaseId: p2.id,
      planMilestoneId: 'metric-check-ins',
      sourceTaskId: null,
      title: 'Check in: Fasting Blood Glucose',
      cadenceLabel: 'Metric check-in',
      actionMode: 'manual',
      metricCheckInId: 'glu-today',
      status: 'pending',
      completedAt: null,
      dueAt: iso(now),
      sortOrder: 10000,
    }),
  );

  return {
    id: 'demo-plan',
    status: 'active',
    createdAt: iso(addDays(now, -ELAPSED_DAYS)),
    currentPhaseId: 'phase-2',
    generatedPlan,
    tasks,
    liveView: {
      currentMilestone: { milestoneId: 'p2-m1', nextExpectedCheckInAt: iso(now) },
      metrics: [
        metricFrom('metric-fasting-glucose', 'Fasting Blood Glucose', 'number', '95', 'daily', null, glu, 'glu-today'),
        metricFrom('metric-body-weight', 'Body Weight', 'weight', '185', 'weekly', ['monday'], wt, null),
      ],
    },
  } as any;
}

// Home screen ("new chat") plan: an actual AI-actionable task + the daily log task.
export function buildHomePlan(now = new Date()) {
  const generatedPlan = buildGeneratedPlan();
  const p1 = generatedPlan.phases[0];

  const tasks = [
    // An actual plan task the AI coach completes (renders with the ✨ instruction + opens chat)
    makeTask({
      id: 'row-meal-prep',
      taskType: 'plan_task',
      planPhaseId: p1.id,
      planMilestoneId: 'p1-m2',
      sourceTaskId: 'p1-m2-t3',
      title: "Plan & prep this week's low-glycemic meals",
      cadenceLabel: 'This week',
      actionMode: 'agent',
      actionPrompt:
        "Build my low-glycemic meal plan and grocery list for the week\nProtein + fiber + healthy fat at every meal, under 30g net carbs.",
      status: 'pending',
      completedAt: null,
      dueAt: iso(now),
      sortOrder: 0,
    }),
    // The daily log task (manual, Mark as done)
    makeTask({
      id: 'row-log-glucose',
      taskType: 'plan_task',
      planPhaseId: p1.id,
      planMilestoneId: 'p1-m1',
      sourceTaskId: 'p1-m1-t2',
      title: 'Log fasting blood glucose first thing each morning',
      cadenceLabel: 'Daily',
      actionMode: 'manual',
      actionPrompt: null,
      status: 'pending',
      completedAt: null,
      dueAt: iso(now),
      sortOrder: 1,
    }),
  ];

  return {
    id: 'demo-plan-home',
    status: 'active',
    createdAt: iso(now),
    currentPhaseId: 'phase-1',
    generatedPlan,
    tasks,
    liveView: {
      currentMilestone: { milestoneId: p1.milestones[0].id, nextExpectedCheckInAt: iso(now) },
      metrics: [
        metricFrom('metric-fasting-glucose', 'Fasting Blood Glucose', 'number', '95', 'daily', null, [], 'glu-today'),
        metricFrom('metric-body-weight', 'Body Weight', 'weight', '185', 'weekly', ['monday'], [], null),
      ],
    },
  } as any;
}

// Freshly-activated plan: Phase 1 current, nothing completed yet, baseline check-in.
// This is what a client sees on day 1, right after signup.
export function buildDay1Plan(now = new Date()) {
  const generatedPlan = buildGeneratedPlan();
  const p1 = generatedPlan.phases[0];

  const tasks: any[] = [];
  let sort = 0;
  p1.milestones[0].tasks.forEach((task: any) => {
    tasks.push(
      makeTask({
        id: `row-${task.id}`,
        taskType: 'plan_task',
        planPhaseId: p1.id,
        planMilestoneId: p1.milestones[0].id,
        sourceTaskId: task.id,
        title: task.title,
        cadenceLabel: task.cadenceLabel,
        actionMode: task.actionMode,
        actionPrompt: task.actionPrompt,
        status: 'pending',
        completedAt: null,
        dueAt: iso(now),
        sortOrder: sort++,
      }),
    );
  });
  tasks.push(
    makeTask({
      id: 'row-glu-checkin',
      taskType: 'metric_check_in',
      planPhaseId: p1.id,
      planMilestoneId: 'metric-check-ins',
      sourceTaskId: null,
      title: 'Check in: Fasting Blood Glucose',
      cadenceLabel: 'Metric check-in',
      actionMode: 'manual',
      metricCheckInId: 'glu-today',
      status: 'pending',
      completedAt: null,
      dueAt: iso(now),
      sortOrder: 10000,
    }),
  );

  const baselineGlu: CheckIn = {
    id: 'glu-baseline',
    checkInDate: localDate(now),
    expectedAt: iso(now),
    submittedAt: iso(now),
    numericValue: 168,
    completionValue: null,
    note: 'Baseline',
  };

  return {
    id: 'demo-plan-day1',
    status: 'active',
    createdAt: iso(now),
    currentPhaseId: 'phase-1',
    generatedPlan,
    tasks,
    liveView: {
      currentMilestone: { milestoneId: p1.milestones[0].id, nextExpectedCheckInAt: iso(now) },
      metrics: [
        metricFrom('metric-fasting-glucose', 'Fasting Blood Glucose', 'number', '95', 'daily', null, [baselineGlu], 'glu-today'),
        metricFrom('metric-body-weight', 'Body Weight', 'weight', '185', 'weekly', ['monday'], [], null),
      ],
    },
  } as any;
}
