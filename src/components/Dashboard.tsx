import { FileText, CheckCircle2, AlertTriangle, XCircle, Server, Zap, Cpu, Database, LogIn, LogOut } from "lucide-react";
import type { ParsedLog } from "@/lib/logParser";

interface DashboardProps {
  data: ParsedLog;
}

export function Dashboard({ data }: DashboardProps) {
  const notes = Array.from(data.notes.values());
  const approved = notes.filter((n) => n.status === "approved").length;
  const contingency = notes.filter((n) => n.status === "contingency").length;
  const withError = notes.filter((n) => n.status === "error").length;

  function timeOnly(ts: string): string {
    const m = ts.match(/(\d{2}:\d{2}:\d{2})$/);
    return m ? m[1] : ts;
  }

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {/* Bloco 1 — Ambiente / sistema */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
        {(data.pdvVersion || data.terminal) && (
          <>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              {data.pdvVersion && <span>v<strong className="text-foreground">{data.pdvVersion}</strong></span>}
              {data.terminal && <span className="text-muted-foreground/60">·</span>}
              {data.terminal && <span>TERMINAL <strong className="text-foreground">{data.terminal}</strong></span>}
            </span>
            <span className="h-4 w-px bg-border" />
          </>
        )}
        {(data.osInfo || data.jreVersion) && (
          <>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />
              {data.osInfo && <span className="text-foreground">{data.osInfo}</span>}
              {data.osInfo && data.jreVersion && <span className="text-muted-foreground/60">·</span>}
              {data.jreVersion && <span>JRE <strong className="text-foreground">{data.jreVersion}</strong></span>}
            </span>
            <span className="h-4 w-px bg-border" />
          </>
        )}
        {data.systemCode && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <strong className="text-foreground">{data.systemCode}</strong>
          </span>
        )}
      </div>

      {/* Bloco 2 — Sessão (login / fechamento) */}
      {(data.pdvLoginTime || data.pdvCloseTime) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          {data.pdvLoginTime && (
            <>
              <span className="flex items-center gap-1 text-muted-foreground">
                <LogIn className="h-3.5 w-3.5" />
                Login <strong className="text-foreground">{timeOnly(data.pdvLoginTime)}</strong>
              </span>
              {data.pdvCloseTime && <span className="h-4 w-px bg-border" />}
            </>
          )}
          {data.pdvCloseTime && (
            <span
              className="flex items-center gap-1 text-muted-foreground"
              title={data.pdvCloseIsLast ? "Último registro no log — sem evento de encerramento" : "PDV encerrado"}
            >
              <LogOut className="h-3.5 w-3.5" />
              {data.pdvCloseIsLast ? "Último reg." : "Fechamento"}{" "}
              <strong className="text-foreground">{timeOnly(data.pdvCloseTime)}</strong>
              {data.pdvCloseIsLast && <span className="text-muted-foreground/60 text-xs ml-1">(Sem registro de fechamento)</span>}
            </span>
          )}
        </div>
      )}

      {/* Bloco 3 — Notas / status */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
        <span className="flex items-center gap-1 text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <strong className="text-foreground">{notes.length}</strong> notas
        </span>
        <span className="h-4 w-px bg-border" />
        <span className="flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <strong>{approved}</strong> aprovadas
        </span>
        {contingency > 0 && (
          <>
            <span className="h-4 w-px bg-border" />
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              <strong>{contingency}</strong> contingência
            </span>
          </>
        )}
        {withError > 0 && (
          <>
            <span className="h-4 w-px bg-border" />
            <span className="flex items-center gap-1 text-error">
              <XCircle className="h-3.5 w-3.5" />
              <strong>{withError}</strong> com erro
            </span>
          </>
        )}
        {data.instabilities.length > 0 && (
          <>
            <span className="h-4 w-px bg-border" />
            <span className="flex items-center gap-1 text-error">
              <Zap className="h-3.5 w-3.5" />
              <strong>{data.instabilities.length}</strong> instabilidades
            </span>
          </>
        )}
      </div>
    </div>
  );
}

