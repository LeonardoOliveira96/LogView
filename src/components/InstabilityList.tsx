import type { Instability } from "@/lib/logParser";
import { Zap } from "lucide-react";

interface InstabilityListProps {
  instabilities: Instability[];
}

export function InstabilityList({ instabilities }: InstabilityListProps) {
  if (instabilities.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        Nenhuma instabilidade detectada. 🎉
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {instabilities.map((inst, i) => (
        <div
          key={i}
          className="animate-slide-up flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4"
        >
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              {inst.time} — Linha {inst.lineNumber}
            </div>
            <p className="mt-1 text-sm text-foreground break-words">{inst.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
