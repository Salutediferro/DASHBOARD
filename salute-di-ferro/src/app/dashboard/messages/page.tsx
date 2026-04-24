"use client";

import { MessagesEmptyState } from "@/components/empty-states";

/**
 * Empty-state surface shown in the right-hand pane when no conversation
 * is selected. On mobile this page isn't reachable visually — the
 * layout hides it and the sidebar fills the viewport (see layout.tsx).
 *
 * The illustration + frame now match every other empty state in the
 * app (see `components/empty-states/index.tsx`) — same chrome→red ring,
 * same radial brand accent, same border. Previously this page had its
 * own inline SVG that drifted from the family.
 */
export default function MessagesPage() {
  return (
    <div className="hidden h-full items-center justify-center px-6 lg:flex">
      <div className="w-full max-w-md">
        <MessagesEmptyState />
      </div>
    </div>
  );
}
