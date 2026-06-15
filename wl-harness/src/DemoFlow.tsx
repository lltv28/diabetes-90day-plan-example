import { useEffect, useState } from 'react';

import WLPaywall from '@electron/pages/Paywall';
import WLSignIn from '@electron/pages/SignIn';
import WLHome from '@electron/pages/Home';

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
      await sleep(1700); // show the empty phone form
      if (!alive()) return;
      const phone = document.querySelector<HTMLInputElement>('#phone');
      if (phone) {
        setReactInput(phone, '+1 415 555 2671');
        await sleep(1300); // pause on the entered phone number
        phone.closest('form')?.requestSubmit();
      }
      for (let i = 0; i < 30 && alive(); i++) {
        if (document.querySelector('#otpCode')) break;
        await sleep(150);
      }
      await sleep(1700); // linger on the "code sent" state with the empty code field
      if (!alive()) return;
      const otp = document.querySelector<HTMLInputElement>('#otpCode');
      if (otp) {
        setReactInput(otp, '481920');
        await sleep(1800); // pause on the entered code
        otp.closest('form')?.requestSubmit();
      }
      await sleep(2200); // hold before moving on
      if (alive()) setStep(2);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, runId]);

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

    </div>
  );
}
