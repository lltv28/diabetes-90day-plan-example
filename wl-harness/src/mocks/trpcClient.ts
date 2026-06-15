// Minimal stand-in for @electron/lib/trpc/client. The real WL plan components
// only touch these three call sites; returning empty/no-op keeps them rendering
// from the seeded `plan` prop (metric charts fall back to recentSubmittedCheckIns).
const noopMutation = { mutate: () => {}, mutateAsync: async () => {}, isPending: false };

export const wlTrpc = {
  useUtils: () => ({ plans: { listMine: { invalidate: () => {} } } }),
  plans: {
    updateTask: { useMutation: (_opts?: unknown) => noopMutation },
    getMetricCharts: { useQuery: (_args?: unknown, _opts?: unknown) => ({ data: undefined, isFetching: false }) },
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;
