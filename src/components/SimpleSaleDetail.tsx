import type { SimpleSale } from "@/lib/logParser";
import { Badge } from "@/components/ui/badge";
import { Copy, CopyCheck } from "lucide-react";
import { useState } from "react";

interface SimpleSaleDetailProps {
  sale: SimpleSale;
}

export function SimpleSaleDetail({ sale }: SimpleSaleDetailProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Venda #{sale.id}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {sale.date} às {sale.time}
          </p>
        </div>
        <Badge
          className={
            sale.status === "closed"
              ? "bg-success/15 text-success border-success/30"
              : "bg-warning/15 text-warning border-warning/30"
          }
          variant="outline"
        >
          {sale.status === "closed" ? "Fechada" : "Aberta"}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Terminal</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{sale.terminal}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Funcionário</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{sale.funcionario}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Forma de Pagamento</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{sale.formaPagamento}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Itens</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{sale.itens.length}</p>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Itens da Venda</h3>
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {sale.itens.map((item) => (
            <div key={`${sale.id}-${item.numeroItem}`} className="flex flex-col gap-3 bg-card/50 p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-foreground">{item.descricaoResumida}</p>
                  <p className="text-xs text-muted-foreground">
                    Código: <code className="bg-muted/50 px-1.5 py-0.5 rounded">{item.codigo}</code> | ID: <code className="bg-muted/50 px-1.5 py-0.5 rounded">{item.id}</code>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Quantidade</p>
                  <p className="font-semibold text-foreground">
                    {item.quantidade} {item.unidade}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unitário</p>
                  <p className="font-semibold text-foreground">
                    R$ {item.valorUnitario.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                {item.valorDesconto > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Desconto</p>
                    <p className="font-semibold text-error">
                      -R$ {item.valorDesconto.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                )}
                <div className={item.valorDesconto > 0 ? "sm:col-span-2" : "sm:col-span-3"}>
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="font-semibold text-foreground">
                    R$ {item.subTotal.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Section */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
        <h3 className="font-semibold text-foreground">Resumo Financeiro</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="text-sm font-medium">
              R$ {sale.vrSubTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total:</span>
            <span className="text-lg font-semibold text-foreground">
              R$ {sale.vrTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Pago:</span>
            <span className="text-lg font-semibold text-success">
              R$ {sale.vrPago.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>
      </div>

      {/* Raw XML */}
      <details className="group rounded-lg border border-border/50 p-4 bg-muted/10">
        <summary className="cursor-pointer font-semibold text-foreground hover:text-primary transition-colors">
          Ver XML Bruto
        </summary>
        <div className="mt-4 space-y-2">
          <div className="relative">
            <pre className="overflow-x-auto bg-muted/50 p-3 rounded text-xs text-muted-foreground max-h-96">
              {sale.raw}
            </pre>
            <button
              onClick={() => copyToClipboard(sale.raw, "raw-xml")}
              className="absolute top-2 right-2 p-2 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Copiar"
            >
              {copiedId === "raw-xml" ? (
                <CopyCheck className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </details>

      {/* Meta Info */}
      <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border/50">
        <p>Linha no log: {sale.lineNumber}</p>
        <p>ID da venda (COO): {sale.id}</p>
      </div>
    </div>
  );
}
