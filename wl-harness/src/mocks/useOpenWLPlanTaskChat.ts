// Real hook navigates into a chat route; in the harness it's a no-op.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOpenWLPlanTaskChat() {
  return (_task: any) => {};
}
