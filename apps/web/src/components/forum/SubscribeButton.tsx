"use client";

import * as React from "react";
import { Bell, Check, X } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

type Variant = "thread" | "reply";

export type SubscribeButtonProps = {
  variant: Variant;
  threadId: string;
  replyId?: string;
  /** Existing subscription id, if the user is already subscribed. */
  initialSubscriptionId?: string | null;
  size?: "default" | "sm";
  className?: string;
};

type Status = "idle" | "submitting" | "error";

export function SubscribeButton({
  variant,
  threadId,
  replyId,
  initialSubscriptionId = null,
  size = "default",
  className,
}: SubscribeButtonProps) {
  const [subscriptionId, setSubscriptionId] = React.useState<string | null>(
    initialSubscriptionId,
  );
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const subscribed = subscriptionId != null;

  async function subscribe() {
    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch("/api/public/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: variant,
          threadId,
          replyId,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (response.status === 401) {
          // Bounce to Kinde login. Preserve the page so the user lands back
          // on the thread they were trying to subscribe to.
          window.location.href = `/api/auth/login?post_login_redirect_url=${encodeURIComponent(
            window.location.pathname + window.location.search,
          )}`;
          return;
        }
        throw new Error(payload.error ?? "订阅失败");
      }
      const payload = (await response.json()) as { id: string };
      setSubscriptionId(payload.id);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "订阅失败");
      setStatus("error");
    }
  }

  async function unsubscribe() {
    if (!subscriptionId) return;
    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch(`/api/public/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "取消订阅失败");
      }
      setSubscriptionId(null);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消订阅失败");
      setStatus("error");
    }
  }

  const label = subscribed
    ? variant === "thread"
      ? "已订阅此帖"
      : "已订阅此楼"
    : variant === "thread"
      ? "订阅该帖"
      : "订阅此楼";

  const Icon = subscribed ? Check : Bell;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant={subscribed ? "secondary" : "primary"}
        size={size}
        disabled={status === "submitting"}
        onClick={subscribed ? unsubscribe : subscribe}
        aria-pressed={subscribed}
      >
        <Icon aria-hidden className="h-4 w-4" />
        {status === "submitting" ? "处理中…" : label}
      </Button>
      {error ? (
        <span className="inline-flex items-center gap-1 text-xs text-[color:var(--error)]">
          <X aria-hidden className="h-3 w-3" />
          {error}
        </span>
      ) : null}
    </div>
  );
}
