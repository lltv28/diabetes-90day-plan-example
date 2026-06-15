// Demo mock layer for the real "smart" screens (Paywall, SignIn) and the sidebar
// container. Nothing here talks to a backend: OTP/login/checkout calls just resolve,
// and the data is fabricated. The autoplay driver advances the steps, not these calls.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createElement } from 'react';

const resolve = async () => {};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- contexts/WLAuthContext ----
export const useWLAuth = () => ({
  user: null,
  profile: { id: 'demo-user', full_name: 'Maria Lopez', email: 'maria@example.com', avatar_url: null },
  agentAccess: [],
  agents: [{ agent_id: 'demo-agent', avatar_url: null, name: 'Dr. Reyes Health' }],
  capabilities: null,
  adminCapabilities: null,
  loading: false,
  signIn: resolve,
  // delay so the SignIn screen lingers on its "sending…" state before the code field
  sendPhoneLoginOtp: async () => {
    await wait(900);
  },
  verifyPhoneLoginOtp: async () => {
    await wait(800);
  },
  sendPhoneChangeOtp: resolve,
  verifyPhoneChangeOtp: resolve,
  signInWithGoogle: resolve,
  signUp: async () => ({ user: null }),
  signOut: resolve,
  resetPassword: resolve,
  refreshAgentAccess: resolve,
  markAgentOnboardingDone: () => {},
});

// ---- contexts/WLUIContext ----
export const useWLUI = () => ({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  selectedAgentName: 'Dr. Reyes Health',
  selectedAgentId: 'demo-agent',
  openSettingsModal: () => {},
  isOnboarding: false,
  isMobile: false,
});

// ---- runtime ----
export const useAppRuntime = () => ({ settingsUrl: '' });
export const getCurrentAppRuntime = () => ({
  isWeb: true,
  audience: 'wl',
  hostType: 'wl-custom',
  platform: 'web',
  settingsUrl: '',
});

// ---- queries/products ----
const DEMO_PRODUCT_STATE = {
  access: { accessKind: 'free', billingExempt: false },
  subscription: null,
  activePrice: null,
  product: { privacy_url: '#', terms_url: '#', support_email: 'support@example.com' },
  paidPlans: [
    {
      id: 'price_monthly',
      name: 'Reverse 90',
      description: 'Your personalized 90-day blood-sugar reset',
      amount_display: '$49/mo',
      billing_interval: 'monthly',
      plan_type: 'subscription',
      duration_value: null,
      duration_unit: null,
      cta_label: 'Get started',
      feature_list: [
        'Personalized 90-day plan',
        'Daily glucose tracking',
        'AI coach over SMS',
        'Weekly check-ins with Dr. Reyes',
      ],
      is_active: true,
      is_primary: true,
      is_recommended: true,
    },
  ],
};

export const useWLSelectedAgentProduct = (_agentId: string | null) => ({
  data: DEMO_PRODUCT_STATE,
  isLoading: false,
  isError: false,
  error: null,
});
export const useWLSelectedAgentUsageSummary = (_agentId: string | null) => ({ data: null });
export const useWLCreateCheckout = () => ({
  mutate: () => {},
  mutateAsync: async () => ({ checkoutUrl: '#' }),
  isPending: false,
});
export const useWLRefreshEntitlement = () => ({ mutate: () => {}, mutateAsync: resolve, isPending: false });
export const getWLCurrentPlanIndicatorCopy = () => null;
export const useHasPlan = () => ({ hasAnyPlan: true });
export const openDashboardUrl = () => {};
export const openExternalUrl = async () => {};
export const BrainPendingBadge = () => null;

// ---- react-router-dom (we drive steps ourselves; navigation is a no-op) ----
export const useNavigate = () => () => {};
export const useLocation = () => ({ pathname: '/chat' });
export const useSearchParams = () => [new URLSearchParams(''), () => {}] as const;
export const Navigate = () => null;
export const Link = ({ children, ...rest }: any) => createElement('a', rest, children);
