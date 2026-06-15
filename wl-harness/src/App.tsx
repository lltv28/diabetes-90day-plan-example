import { useMemo } from 'react';

// Real WL plan components, imported straight from the kodara checkout.
import { WLPlanMetricsPanel } from '@electron/components/plans/WLPlanMetricsPanel';
import { WLOverallPlanProgressCard } from '@electron/components/plans/WLOverallPlanProgressCard';
import { WLPhaseCard } from '@electron/components/plans/WLPhaseCard';
import { WLCompletedPhasesSection } from '@electron/components/plans/WLCompletedPhasesSection';
// Real layout chrome: the presentational sidebar view + gradient background.
import { WLSidebarView, type WLSidebarViewModel } from '@electron/components/layout/WLSidebar';
import { WLGradientBackground } from '@electron/components/common/WLGradientBackground';
import { ChatsIcon, CoursesIcon, PenIcon, PlanIcon } from '@electron/components/common/WLIcons';

import { buildPlan } from './seed';

const font = { fontFamily: 'var(--wl-font-family)' };
const AGENT_ID = 'demo-agent';
const FIRST_NAME = 'Maria';
const noop = () => {};

// Hand-built view model — the same shape WLSidebar computes from auth/tRPC, so the
// real WLSidebarView renders without any of that plumbing. "Plan" is the active tab.
const sidebarModel: WLSidebarViewModel = {
  sidebarCollapsed: false,
  onToggleSidebar: noop,
  agentName: 'Dr. Reyes Health',
  agentAvatarUrl: null,
  profile: { full_name: 'Maria Lopez', email: 'maria@example.com', avatar_url: null },
  onSettingsClick: noop,
  onOpenPaywall: noop,
  usageCard: null,
  navItems: [
    { id: 'new-chat', label: 'New Chat', icon: <PenIcon className="w-5 h-5" />, isActive: false, onClick: noop },
    { id: 'courses', label: 'Courses', icon: <CoursesIcon className="w-5 h-5" />, isActive: false, onClick: noop },
    { id: 'history', label: 'Chats', icon: <ChatsIcon className="w-5 h-5" />, isActive: false, onClick: noop },
    { id: 'plan', label: 'Plan', icon: <PlanIcon className="w-5 h-5" />, isActive: true, onClick: noop },
  ],
};

export function App() {
  const plan = useMemo(() => buildPlan(new Date()), []);

  return (
    // Mirrors WLMainLayout: gradient bg + sidebar + scrollable content column.
    <div className="relative h-screen bg-white overflow-hidden">
      <WLGradientBackground />
      <div className="relative flex h-full">
        <WLSidebarView model={sidebarModel} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-[800px] px-6 py-8">
              <main data-slot="wl-plan-main" className="min-w-0 space-y-6">
                <WLPlanMetricsPanel agentId={AGENT_ID} plan={plan} onCheckInMetric={noop} />

                <header className="flex items-center justify-between gap-3">
                  <h1 className="text-[16px] font-normal leading-6 tracking-[-0.5px] text-black" style={font}>
                    Hey {FIRST_NAME}, here is your plan progress
                  </h1>
                  <button
                    type="button"
                    className="shrink-0 text-[14px] font-medium leading-5 text-[#008ba7] transition-colors hover:text-[#006f89] cursor-pointer"
                    style={font}
                  >
                    See all plan
                  </button>
                </header>

                <WLOverallPlanProgressCard plan={plan} />

                <WLPhaseCard plan={plan} agentId={AGENT_ID} onCheckInTask={noop} />

                <WLCompletedPhasesSection plan={plan} />
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
