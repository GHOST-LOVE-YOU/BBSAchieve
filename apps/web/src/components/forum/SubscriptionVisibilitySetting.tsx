"use client";

import { useSyncExternalStore } from "react";

const KEY = "byr-achieve.hide-subscription-controls";
const EVENT = "byr-subscription-visibility";
function subscribe(listener: () => void) {
  function sync(event: StorageEvent) {
    if (event.key !== KEY && event.key !== null) return;
    try {
      document.documentElement.dataset.hideSubscriptions = String(localStorage.getItem(KEY) === "true");
    } catch { /* 保留当前页面选择。 */ }
    listener();
  }
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", sync);
  };
}
function isHidden() {
  return document.documentElement.dataset.hideSubscriptions === "true";
}
export function SubscriptionVisibilitySetting() {
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);
  function toggle() {
    document.documentElement.dataset.hideSubscriptions = String(!hidden);
    try { localStorage.setItem(KEY, String(!hidden)); } catch { /* 存储不可用时，本次页面仍生效。 */ }
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <div className="mb-5 flex items-center justify-between gap-5 border-b border-[color:var(--hairline)] pb-5">
      <div>
        <label id="subscription-visibility-label" className="text-sm font-medium text-[color:var(--ink)]">显示订阅按钮</label>
        <p id="subscription-visibility-help" className="mt-1 text-sm leading-6 text-[color:var(--ink-secondary)]">隐藏帖子和楼层的订阅入口，不影响已有订阅与通知。仅在当前浏览器生效。</p>
      </div>
      <button type="button" role="switch" aria-checked={!hidden} aria-labelledby="subscription-visibility-label" aria-describedby="subscription-visibility-help" onClick={toggle} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]">
        <span aria-hidden className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${hidden ? "bg-[color:var(--ink-tertiary)]" : "bg-[color:var(--primary)]"}`}>
          <span className={`h-5 w-5 rounded-full bg-white transition-transform motion-reduce:transition-none ${hidden ? "translate-x-0" : "translate-x-5"}`} />
        </span>
      </button>
    </div>
  );
}
