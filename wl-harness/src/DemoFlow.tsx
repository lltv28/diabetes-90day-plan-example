import { useEffect, useState } from 'react';

import WLPaywall from '@electron/pages/Paywall';
import WLSignIn from '@electron/pages/SignIn';
import WLHome from '@electron/pages/Home';
import { RotateCcw } from 'lucide-react';

const font = { fontFamily: 'var(--wl-font-family)' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STEPS = [
  { id: 'paywall', label: 'Choose a plan & pay', caption: 'Maria picks a plan and checks out.' },
  { id: 'signin', label: 'Verify by SMS', caption: 'A 2FA code is texted to her phone — she enters it to log in.' },
  { id: 'plan', label: 'Home — day 1', caption: 'She lands on her home screen with her first task assigned.' },
] as const;

// Set a React-controlled input's value so the component's state updates.
function setReactInput(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function DemoFlow() {
  const [step, setStep] = useState(0);
  const [runId, setRunId] = useState(0);
  const [processing, setProcessing] = useState(false);

  // Step 0 — paywall: press the recommended plan, show a checkout beat, advance.
  useEffect(() => {
    if (STEPS[step].id !== 'paywall') return;
    setProcessing(false);
    const t1 = setTimeout(() => {
      const btns = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Get started');
      btns[btns.length - 1]?.click();
      setProcessing(true);
    }, 1700);
    const t2 = setTimeout(() => setStep(1), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step, runId]);

  // Step 1 — SignIn: drive the real phone -> code -> verify form, then advance.
  useEffect(() => {
    if (STEPS[step].id !== 'signin') return;
    let cancelled = false;
    const alive = () => !cancelled;
    (async () => {
      await sleep(1100);
      if (!alive()) return;
      const phone = document.querySelector<HTMLInputElement>('#phone');
      if (phone) {
        setReactInput(phone, '+1 415 555 2671');
        await sleep(500);
        phone.closest('form')?.requestSubmit();
      }
      for (let i = 0; i < 25 && alive(); i++) {
        if (document.querySelector('#otpCode')) break;
        await sleep(150);
      }
      await sleep(800);
      if (!alive()) return;
      const otp = document.querySelector<HTMLInputElement>('#otpCode');
      if (otp) {
        setReactInput(otp, '481920');
        await sleep(1000);
        otp.closest('form')?.requestSubmit();
      }
      await sleep(1300);
      if (alive()) setStep(2);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, runId]);

  const restart = () => {
    setProcessing(false);
    setRunId((r) => r + 1);
    setStep(0);
  };

  const current = STEPS[step];

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div key={runId} className="absolute inset-0">
        {current.id === 'paywall' && <WLPaywall />}
        {current.id === 'signin' && <WLSignIn />}
        {current.id === 'plan' && <WLHome />}
      </div>

      {/* faux checkout beat over the paywall */}
      {processing && current.id === 'paywall' && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-2xl border border-[rgba(26,26,26,0.08)] bg-white px-6 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.1)]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(26,26,26,0.15)] border-t-[#4f46e5]" />
            <span className="text-[14px] font-medium text-[rgba(26,26,26,0.8)]" style={font}>
              Processing payment…
            </span>
          </div>
        </div>
      )}

      {/* demo chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-center px-4 pt-4">
        <div className="pointer-events-auto flex w-full max-w-[640px] items-center gap-4 rounded-full border border-[rgba(26,26,26,0.08)] bg-white/85 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === step ? 22 : 8, background: i <= step ? '#00b4d4' : 'rgba(26,26,26,0.14)' }}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[rgba(26,26,26,0.85)]" style={font}>
              {step + 1}. {current.label}
            </div>
            <div className="truncate text-[12px] text-[rgba(26,26,26,0.55)]" style={font}>
              {current.caption}
            </div>
          </div>
          <button
            type="button"
            onClick={restart}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[rgba(0,180,212,0.1)] px-3 py-1.5 text-[12px] font-medium text-[#008ba7] transition-colors hover:bg-[rgba(0,180,212,0.18)] cursor-pointer"
            style={font}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
