/**
 * Brand-wrapped `toast` that pairs each semantic call with a matching
 * haptic beat. Lets consumers fire `toast.success("Salvato")` and get
 * the visual + tactile feedback in one line.
 *
 * Every other method on Sonner's `toast` is forwarded untouched, so
 * `toast.message`, `toast.custom`, `toast.promise`, etc. keep working.
 *
 * Import from `@/lib/toast` instead of `"sonner"` where you want the
 * haptic side-effect. Passing imports untouched (`import { toast } from
 * "sonner"`) stays valid for places where a silent toast is preferable
 * (background cache updates, etc.).
 */

import { toast as sonnerToast } from "sonner";
import { haptic } from "@/lib/haptic";

type ToastFn = typeof sonnerToast;
type Opts = Parameters<ToastFn>[1];

export const toast = Object.assign(
  (message: Parameters<ToastFn>[0], opts?: Opts) => sonnerToast(message, opts),
  sonnerToast,
  {
    success: (message: Parameters<ToastFn>[0], opts?: Opts) => {
      haptic.success();
      return sonnerToast.success(message, opts);
    },
    error: (message: Parameters<ToastFn>[0], opts?: Opts) => {
      haptic.error();
      return sonnerToast.error(message, opts);
    },
    warning: (message: Parameters<ToastFn>[0], opts?: Opts) => {
      haptic.impact();
      return sonnerToast.warning(message, opts);
    },
    info: (message: Parameters<ToastFn>[0], opts?: Opts) => {
      haptic.tap();
      return sonnerToast.info(message, opts);
    },
  },
);
