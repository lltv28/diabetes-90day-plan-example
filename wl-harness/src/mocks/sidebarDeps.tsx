// WLSidebar.tsx bundles the smart container + the presentational WLSidebarView in
// one module. We only render the view (fed a hand-built model), but the container's
// top-level imports must still resolve. These no-op exports satisfy the bindings;
// none are ever called because the WLSidebar() container is never invoked.
export const useAppRuntime = () => ({ settingsUrl: '' });
export const useWLAuth = () => ({ agents: [], profile: null, adminCapabilities: null });
export const useWLUI = () => ({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  selectedAgentName: '',
  selectedAgentId: null,
  openSettingsModal: () => {},
  isOnboarding: false,
  isMobile: false,
});
export const openDashboardUrl = () => {};
export const getWLCurrentPlanIndicatorCopy = () => null;
export const useWLSelectedAgentUsageSummary = () => ({ data: null });
export const useHasPlan = () => ({ hasAnyPlan: true });
export const BrainPendingBadge = () => null;
export const useLocation = () => ({ pathname: '/plan' });
export const useNavigate = () => () => {};
