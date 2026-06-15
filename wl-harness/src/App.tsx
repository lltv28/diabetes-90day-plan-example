import { useMemo } from 'react';

// Real WL plan components, imported straight from the kodara checkout.
import { WLPlanMetricsPanel } from '@electron/components/plans/WLPlanMetricsPanel';
import { WLOverallPlanProgressCard } from '@electron/components/plans/WLOverallPlanProgressCard';
import { WLPhaseCard } from '@electron/components/plans/WLPhaseCard';
import { WLCompletedPhasesSection } from '@electron/components/plans/WLCompletedPhasesSection';

import { buildPlan } from './seed';

const font = { fontFamily: 'var(--wl-font-family)' };
const AGENT_ID = 'demo-agent';
const FIRST_NAME = 'Maria';

export function App() {
  const plan = useMemo(() => buildPlan(new Date()), []);

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto w-full max-w-[800px] px-6 py-8">
        <main data-slot="wl-plan-main" className="min-w-0 space-y-6">
          <WLPlanMetricsPanel agentId={AGENT_ID} plan={plan} onCheckInMetric={() => {}} />

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

          <WLPhaseCard plan={plan} agentId={AGENT_ID} onCheckInTask={() => {}} />

          <WLCompletedPhasesSection plan={plan} />
        </main>
      </div>
    </div>
  );
}
