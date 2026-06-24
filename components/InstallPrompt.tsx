"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-zinc-900 text-white rounded-2xl p-4
                    flex items-center justify-between shadow-xl">
      <div>
        <p className="text-sm font-semibold">Add to Home Screen</p>
        <p className="text-xs text-zinc-400 mt-0.5">Install ShiftTrack for quick access</p>
      </div>
      <div className="flex gap-2 ml-4 flex-shrink-0">
        <button
          onClick={() => setVisible(false)}
          className="text-xs text-zinc-400 px-3 py-2 rounded-lg"
        >
          Later
        </button>
        <button
          onClick={async () => {
            await deferredPrompt.prompt();
            setVisible(false);
            setDeferredPrompt(null);
          }}
          className="bg-white text-zinc-900 text-xs font-semibold px-4 py-2 rounded-xl"
        >
          Install
        </button>
      </div>
    </div>
  );
}
