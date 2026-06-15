// Ported verbatim from apps/electron/src/pages/Plan.tsx (applyOptimisticCheckIns +
// helpers) so a submitted check-in updates the metric value/chart immediately,
// exactly as the real page does. Typed loosely to avoid the @api router types.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type WLMetricCheckInSubmission = {
  checkInDate: string;
  checkInId: string;
  completionValue: boolean | null;
  expectedAt: string;
  metricId: string;
  note: null;
  numericValue: number | null;
  submittedAt: string;
};

function toSubmittedCheckIn(submission: WLMetricCheckInSubmission) {
  return {
    id: submission.checkInId,
    checkInDate: submission.checkInDate,
    expectedAt: submission.expectedAt,
    submittedAt: submission.submittedAt,
    numericValue: submission.numericValue,
    completionValue: submission.completionValue,
    note: submission.note,
  };
}

function sortSubmittedCheckInsByDateDesc(left: any, right: any) {
  if (left.checkInDate !== right.checkInDate) {
    return right.checkInDate.localeCompare(left.checkInDate);
  }
  return right.submittedAt.localeCompare(left.submittedAt);
}

export function applyOptimisticCheckIns(plan: any, patches: Record<string, WLMetricCheckInSubmission>): any {
  const submissions = Object.values(patches);
  if (submissions.length === 0) {
    return plan;
  }

  const submissionsByCheckInId = new Map(submissions.map((s) => [s.checkInId, s]));

  return {
    ...plan,
    liveView: {
      ...plan.liveView,
      metrics: plan.liveView.metrics.map((metric: any) => {
        const metricSubmissions = submissions.filter((c) => c.metricId === metric.metricId);
        if (metricSubmissions.length === 0) {
          return metric;
        }

        const submittedCheckInIds = new Set(metricSubmissions.map((s) => s.checkInId));
        const recentSubmittedCheckIns = metricSubmissions
          .reduce((rows: any[], submission) => {
            const submittedCheckIn = toSubmittedCheckIn(submission);
            return [
              submittedCheckIn,
              ...rows.filter(
                (checkIn) => checkIn.id !== submission.checkInId && checkIn.checkInDate !== submission.checkInDate,
              ),
            ];
          }, metric.recentSubmittedCheckIns)
          .sort(sortSubmittedCheckInsByDateDesc);

        return {
          ...metric,
          latestSubmittedCheckIn: recentSubmittedCheckIns[0] || metric.latestSubmittedCheckIn,
          previousSubmittedCheckIn: recentSubmittedCheckIns[1] || null,
          recentSubmittedCheckIns,
          nextPendingCheckIn:
            metric.nextPendingCheckIn && submittedCheckInIds.has(metric.nextPendingCheckIn.id)
              ? null
              : metric.nextPendingCheckIn,
        };
      }),
    },
    tasks: plan.tasks.map((task: any) => {
      if (!task.metricCheckInId || !submissionsByCheckInId.has(task.metricCheckInId)) {
        return task;
      }
      const submission = submissionsByCheckInId.get(task.metricCheckInId)!;
      return { ...task, completedAt: submission.submittedAt, isCurrentInstance: false, status: 'completed' as const };
    }),
  };
}
