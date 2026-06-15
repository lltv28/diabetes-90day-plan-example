// Minimal stand-in for @electron/lib/trpc/client. The real WL plan components
// only touch these call sites; returning empty/no-op keeps them rendering from
// the seeded `plan` (metric charts fall back to recentSubmittedCheckIns).
import { buildHomePlan } from '../seed';

const noopMutation = { mutate: () => {}, mutateAsync: async () => {}, isPending: false };

// The Home ("new chat") screen loads its plan via plans.listMine — serve the
// 1-task home plan. (The standalone plans view passes its plan as a prop instead.)
let homePlan: unknown;

export const wlTrpc = {
  useUtils: () => ({ plans: { listMine: { invalidate: () => {} } } }),
  plans: {
    updateTask: { useMutation: (_opts?: unknown) => noopMutation },
    submitMetricCheckIn: { useMutation: (_opts?: unknown) => noopMutation },
    completeMilestone: { useMutation: (_opts?: unknown) => noopMutation },
    getMetricCharts: { useQuery: (_args?: unknown, _opts?: unknown) => ({ data: undefined, isFetching: false }) },
    listMine: {
      useQuery: (_args?: unknown, _opts?: unknown) => {
        homePlan ??= buildHomePlan();
        return { data: { active: homePlan, past: [] }, isPending: false, isError: false, refetch: async () => {} };
      },
    },
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;
