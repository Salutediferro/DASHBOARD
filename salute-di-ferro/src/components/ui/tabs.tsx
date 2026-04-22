"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        // Base UI's Tabs Root sets `data-orientation=horizontal|vertical`.
        // Tailwind's `data-horizontal:` shorthand doesn't match that
        // attribute, so we use the explicit arbitrary selector here —
        // without it, horizontal tabs collapse to flex-row and the list
        // renders side-by-side with the panel.
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // `pills` variant matches the CategoryPill pattern used on Cartella
  // Clinica — rounded-full pills, no grey container behind them. It is
  // the new default because the old grey block (`default`/`bg-muted`)
  // read as a flat grey slab on dark theme.
  "group/tabs-list inline-flex items-center gap-1.5 group-data-[orientation=horizontal]/tabs:flex-wrap group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch",
  {
    variants: {
      variant: {
        // Kept for legacy callers that explicitly asked for the grey box.
        default: "w-fit justify-center rounded-lg bg-muted p-[3px] h-8 group-data-[orientation=vertical]/tabs:h-fit",
        // New default look — brand-red tint on active, no container.
        pills: "bg-transparent",
        line: "gap-1 bg-transparent h-8 group-data-[orientation=vertical]/tabs:h-fit rounded-none",
      },
    },
    defaultVariants: {
      variant: "pills",
    },
  }
)

function TabsList({
  className,
  variant = "pills",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "focus-ring relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // --- pills variant (new default, mirrors medical-records CategoryPill)
        "group-data-[variant=pills]/tabs-list:rounded-full group-data-[variant=pills]/tabs-list:border group-data-[variant=pills]/tabs-list:px-3 group-data-[variant=pills]/tabs-list:py-1 group-data-[variant=pills]/tabs-list:text-xs",
        "group-data-[variant=pills]/tabs-list:border-border/60 group-data-[variant=pills]/tabs-list:bg-muted/40 group-data-[variant=pills]/tabs-list:text-muted-foreground",
        "group-data-[variant=pills]/tabs-list:hover:bg-muted group-data-[variant=pills]/tabs-list:hover:text-foreground",
        "group-data-[variant=pills]/tabs-list:data-active:border-primary-500/40 group-data-[variant=pills]/tabs-list:data-active:bg-primary-500/15 group-data-[variant=pills]/tabs-list:data-active:text-primary-500",
        // --- default (legacy grey box) variant
        "group-data-[variant=default]/tabs-list:h-[calc(100%-1px)] group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:rounded-md group-data-[variant=default]/tabs-list:border group-data-[variant=default]/tabs-list:border-transparent group-data-[variant=default]/tabs-list:px-1.5 group-data-[variant=default]/tabs-list:py-0.5 group-data-[variant=default]/tabs-list:text-foreground/60 group-data-[variant=default]/tabs-list:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:data-active:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm dark:group-data-[variant=default]/tabs-list:text-muted-foreground dark:group-data-[variant=default]/tabs-list:data-active:border-input dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30 dark:group-data-[variant=default]/tabs-list:data-active:text-foreground",
        // --- line variant (underline)
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-1.5 group-data-[variant=line]/tabs-list:py-0.5 group-data-[variant=line]/tabs-list:text-foreground/60 group-data-[variant=line]/tabs-list:hover:text-foreground group-data-[variant=line]/tabs-list:data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:after:transition-opacity group-data-[variant=line]/tabs-list:group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[variant=line]/tabs-list:group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[variant=line]/tabs-list:group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[variant=line]/tabs-list:group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[variant=line]/tabs-list:group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[variant=line]/tabs-list:group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("text-sm outline-none data-vertical:flex-1", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
