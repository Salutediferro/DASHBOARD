"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal sortable wrapper around any tile/card. Drag listeners attach
 * to the grip handle (top-right, hidden until hover/focus) so the card
 * body keeps its normal click semantics — important when the body is
 * itself a Link or a button.
 *
 * Pair with `<DndContext>` + `<SortableContext items={ids}>` in the
 * parent. The id you pass here must match the corresponding entry in
 * the SortableContext items array.
 */
export function SortableCard({
  id,
  children,
  handleClassName,
}: {
  id: string;
  children: React.ReactNode;
  handleClassName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "ring-primary/40 rounded-xl opacity-80 ring-2",
      )}
    >
      <button
        type="button"
        aria-label="Trascina per riordinare"
        title="Trascina per riordinare"
        {...attributes}
        {...listeners}
        className={cn(
          "text-muted-foreground/60 hover:bg-muted hover:text-foreground absolute top-1.5 right-1.5 z-10 inline-flex h-5 w-5 cursor-grab items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing",
          handleClassName,
        )}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </button>
      {children}
    </div>
  );
}
