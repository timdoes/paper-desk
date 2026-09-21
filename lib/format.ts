export function parseBrokerNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQty(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatPct(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export type PnlTone = "up" | "down" | "flat";

export function pnlTone(value: number | null | undefined): PnlTone {
  if (value == null || Number.isNaN(value) || value === 0) {
    return "flat";
  }
  return value > 0 ? "up" : "down";
}

export function pnlClass(value: number | null | undefined): string {
  const tone = pnlTone(value);
  switch (tone) {
    case "up":
      return "text-emerald-400";
    case "down":
      return "text-rose-400";
    case "flat":
      return "text-muted-foreground";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function formatDeskDay(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
