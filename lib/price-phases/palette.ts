import type { PhaseKind } from "./types";

/**
 * Up / down / flat fills for the Price journey bands and legend — the KPI sparkline's
 * ramp. Lives outside the "use client" chart so the server-rendered legend reads real
 * values (a constant imported from a client module arrives as a client reference).
 */
export const PHASE_HEX: Record<PhaseKind, string> = { up: "#10b981", down: "#f43f5e", side: "#94a3b8" };
