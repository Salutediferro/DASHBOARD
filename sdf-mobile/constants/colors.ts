export const colors = {
  bg0: "#0A0A0A",
  bg1: "#1A1A1A",
  bg2: "#2A2A2A",
  gold: "#C9A96E",
  text: "#F5F5F5",
  textMuted: "#9CA3AF",
  border: "#2A2A2A",
  success: "#10B981",
  danger: "#EF4444",
} as const;

export type AppColor = keyof typeof colors;
