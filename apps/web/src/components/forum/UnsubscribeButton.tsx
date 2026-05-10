"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/src/components/ui/button";

export function UnsubscribeButton({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消订阅失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={busy}
      >
        <X aria-hidden className="h-4 w-4" />
        {busy ? "正在取消…" : "取消订阅"}
      </Button>
      {error ? (
        <span className="text-xs text-[color:var(--error)]">{error}</span>
      ) : null}
    </div>
  );
}
