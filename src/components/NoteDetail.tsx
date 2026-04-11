import { useState } from "react";
import type { Note } from "@/lib/logParser";
import { X, AlertTriangle, Code2, DollarSign, Hash, CreditCard, Package, Calendar } from "lucide-react";
import { XmlViewerModal } from "./XmlViewerModal";

interface NoteDetailProps {
  note: Note;
  onClose: () => void;
}

export function NoteDetail({ note, onClose }: NoteDetailProps) {
  const [showXml, setShowXml] = useState(false);

  return (
    <>
      <div className="animate-fade-in rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            Nota #{note.number}{note.serie ? <span className="ml-2 text-sm font-normal text-muted-foreground">Série {note.serie}</span> : null}
          </h3>
          <div className="flex items-center gap-2">
            {note.nfeXml && (
              <button
                onClick={() => setShowXml(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Code2 className="h-3.5 w-3.5" />
                Ver XML
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary info strip */}
        {(note.valor > 0 || note.protocolo || note.formaPagamento || note.dhEmissao) && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {note.valor > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                <DollarSign className="h-3.5 w-3.5 shrink-0 text-success" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    R$ {note.valor.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>
            )}
            {note.formaPagamento && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                <CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pagamento</p>
                  <p className="truncate text-sm font-semibold text-foreground">{note.formaPagamento}</p>
                </div>
              </div>
            )}
            {note.protocolo && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Protocolo</p>
                  <p className="truncate text-xs font-mono text-foreground">{note.protocolo}</p>
                </div>
              </div>
            )}
            {note.dhEmissao && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Emissão</p>
                  <p className="truncate text-xs text-foreground">{note.dhEmissao.replace("T", " ").replace(/-03:00$/, "")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chave de acesso */}
        {note.chaveAcesso && (
          <div className="mb-4 rounded-lg bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Chave de Acesso</p>
            <p className="font-mono text-xs text-foreground break-all">{note.chaveAcesso}</p>
          </div>
        )}

        {/* Items table */}
        {note.itens.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-muted-foreground">Itens ({note.itens.length})</h4>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">#</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">Produto</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">Qtd</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">Unit.</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {note.itens.map((item) => (
                    <tr key={item.numero} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{item.numero}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground truncate max-w-[180px]" title={item.descricao}>
                          {item.descricao}
                        </p>
                        <p className="text-muted-foreground">{item.codigo} · NCM {item.ncm} · CFOP {item.cfop}</p>
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        {item.quantidade.toLocaleString("pt-BR")} {item.unidade}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground">
                        R$ {item.valorUnitario.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        R$ {item.valorTotal.toFixed(2).replace(".", ",")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contingency info banner */}
        {note.contingency && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-warning">Emissão em Contingência</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {note.contingencyReason || "Motivo não identificado"}
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {note.errors.length > 0 && (
          <div className="mb-4 space-y-2">
            {note.errors.map((err, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-error/20 bg-error/5 p-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{err.date} {err.time}</p>
                  <p className="mt-0.5 text-sm text-error break-words">
                    {err.description.length > 300 ? err.description.substring(0, 300) + "..." : err.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Timeline de Eventos</h4>
        {note.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <div className="relative ml-3 border-l-2 border-border pl-6 space-y-4 max-h-[300px] overflow-y-auto">
            {note.events.map((event, i) => {
              const isErr = event.type === "ERROR" || event.type === "REJEIÇÃO";
              const isWarn = event.type === "CONTINGÊNCIA";
              const isOk = event.type === "AUTORIZADO";
              return (
                <div key={i} className="relative">
                  <div
                    className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 ${isErr
                      ? "border-error bg-error/30"
                      : isWarn
                        ? "border-warning bg-warning/30"
                        : isOk
                          ? "border-success bg-success/30"
                          : "border-primary bg-primary/30"
                      }`}
                  />
                  <div className="text-xs text-muted-foreground">{event.time}</div>
                  <div className="mt-0.5 text-sm">
                    <span
                      className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${isErr
                        ? "bg-error/15 text-error"
                        : isWarn
                          ? "bg-warning/15 text-warning"
                          : isOk
                            ? "bg-success/15 text-success"
                            : "bg-primary/10 text-primary"
                        }`}
                    >
                      {event.type || "INFO"}
                    </span>
                    <span className="text-foreground">{event.description}</span>
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 space-y-1">
                      {Object.entries(event.metadata).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                          <span className="shrink-0 font-medium text-muted-foreground w-36">{k}</span>
                          <span className={`break-all ${k === "Chave de Acesso" ? "font-mono text-foreground/80" : "text-foreground"}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showXml && (
        <XmlViewerModal
          xml={note.nfeXml}
          title={`XML da Nota #${note.number}`}
          onClose={() => setShowXml(false)}
        />
      )}
    </>
  );
}

