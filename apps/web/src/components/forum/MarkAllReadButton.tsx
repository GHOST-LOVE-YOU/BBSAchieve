"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/src/components/ui/button";

export function MarkAllReadButton({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleClick() {
    if (busy || !hasUnread) return;
    setBusy(true);
    try {
      await fetch("/api/public/notifications/read-all", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="tertiary"
      size="sm"
      onClick={handleClick}
      disabled={busy || !hasUnread}
    >
      <Check aria-hidden className="h-4 w-4" />
      {busy ? "正在标记…" : "全部标为已读"}
    </Button>
  );
}
