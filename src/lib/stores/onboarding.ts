import { create } from "zustand";

export type CoachOnboardingData = {
  avatarUrl: string | null;
  bio: string;
  specializations: string[];
  yearsExperience: number;
  availability: Record<number, { start: string; end: string; closed: boolean }>;
  brandColor: string;
  brandName: string;
  logoUrl: string | null;
  createdFirstTemplate: boolean;
  inviteEmails: string[];
};

type CoachState = {
  step: number;
  data: CoachOnboardingData;
  setStep: (s: number) => void;
  update: (patch: Partial<CoachOnboardingData>) => void;
  reset: () => void;
};

const coachInitial: CoachOnboardingData = {
  avatarUrl: null,
  bio: "",
  specializations: [],
  yearsExperience: 0,
  availability: {
    0: { start: "09:00", end: "13:00", closed: true },
    1: { start: "08:00", end: "20:00", closed: false },
    2: { start: "08:00", end: "20:00", closed: false },
    3: { start: "08:00", end: "20:00", closed: false },
    4: { start: "08:00", end: "20:00", closed: false },
    5: { start: "08:00", end: "20:00", closed: false },
    6: { start: "09:00", end: "13:00", closed: false },
  },
  brandColor: "#C9A96E",
  brandName: "",
  logoUrl: null,
  createdFirstTemplate: false,
  inviteEmails: [],
};

export const useCoachOnboarding = create<CoachState>((set) => ({
  step: 1,
  data: coachInitial,
  setStep: (step) => set({ step }),
  update: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  reset: () => set({ step: 1, data: coachInitial }),
}));

// ---------------------------------------------------------------------------

export type ClientOnboardingData = {
  avatarUrl: string | null;
  birthDate: string;
  sex: "M" | "F" | "";
  heightCm: number;
  weightKg: number;
  goal: "MASS" | "CUTTING" | "STRENGTH" | "HEALTH" | "SPORT" | "";
  targetWeightKg: number | null;
  experience: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "";
  yearsTraining: number;
  injuries: string;
  equipment: string[];
};

type ClientState = {
  step: number;
  data: ClientOnboardingData;
  setStep: (s: number) => void;
  update: (patch: Partial<ClientOnboardingData>) => void;
  reset: () => void;
};

const clientInitial: ClientOnboardingData = {
  avatarUrl: null,
  birthDate: "",
  sex: "",
  heightCm: 175,
  weightKg: 75,
  goal: "",
  targetWeightKg: null,
  experience: "",
  yearsTraining: 0,
  injuries: "",
  equipment: [],
};

export const useClientOnboarding = create<ClientState>((set) => ({
  step: 1,
  data: clientInitial,
  setStep: (step) => set({ step }),
  update: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  reset: () => set({ step: 1, data: clientInitial }),
}));
