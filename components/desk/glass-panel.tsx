import type { ReactNode } from "react";
import { cn } from "cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-white/8 bg-white/[0.035] py-0 shadow-[0_0_80px_-24px_rgba(16,185,129,0.35)] ring-1 ring-white/10 backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function GlassHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <CardHeader className="border-b border-white/6 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle className="font-mono text-[11px] tracking-[0.22em] text-emerald-300/90 uppercase">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="mt-1 text-xs text-white/45">
              {description}
            </CardDescription>
          ) : null}
        </div>
        {action}
      </div>
    </CardHeader>
  );
}

export function GlassBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <CardContent className={cn("px-5 py-4", className)}>{children}</CardContent>;
}
