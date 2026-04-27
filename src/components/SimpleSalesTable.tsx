import type { SimpleSale } from "@/lib/logParser";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SimpleSalesTableProps {
  sales: SimpleSale[];
  onSelectSale: (sale: SimpleSale) => void;
  selectedSale: SimpleSale | null;
}

export function SimpleSalesTable({
  sales,
  onSelectSale,
  selectedSale,
}: SimpleSalesTableProps) {
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  const toggleExpanded = (saleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  if (sales.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        Nenhuma venda simples encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">COO</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Data/Hora</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Terminal</th>
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Forma de Pagamento</th>
              <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Itens</th>
              <th className="px-5 py-3 text-right font-semibold text-muted-foreground">Total</th>
              <th className="px-5 py-3 text-center font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const isSelected = selectedSale?.id === sale.id;
              const isExpanded = expandedSales.has(sale.id);

              return (
                <tbody key={sale.id}>
                  <tr
                    onClick={() => onSelectSale(sale)}
                    className={`cursor-pointer border-b border-border transition-colors hover:bg-muted/40 ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-foreground">#{sale.id}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {sale.date} {sale.time}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{sale.terminal}</td>
                    <td className="px-5 py-3 text-muted-foreground">{sale.formaPagamento}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {sale.itens.length} item{sale.itens.length !== 1 ? "ns" : ""}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      R$ {sale.vrTotal.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          sale.status === "closed"
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-warning/15 text-warning border-warning/30"
                        }
                      >
                        {sale.status === "closed" ? "Fechada" : "Aberta"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={(e) => toggleExpanded(sale.id, e)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </td>
                  </tr>

                  {/* Expandable rows for items */}
                  {isExpanded && (
                    <tr className="border-b border-border bg-muted/20">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="space-y-3">
                          <header className="font-semibold text-foreground">Itens ({sale.itens.length})</header>
                          <div className="space-y-2">
                            {sale.itens.map((item) => (
                              <div
                                key={`${sale.id}-${item.numeroItem}`}
                                className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 text-xs"
                              >
                                <div className="flex-1 space-y-1">
                                  <div className="font-medium text-foreground">
                                    {item.descricaoResumida}
                                  </div>
                                  <div className="text-muted-foreground">
                                    Código: {item.codigo} | NCM: {item.id || "—"}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                  <div className="text-muted-foreground">
                                    {item.quantidade} {item.unidade} × R${" "}
                                    {item.valorUnitario.toFixed(2).replace(".", ",")}
                                  </div>
                                  {item.valorDesconto > 0 && (
                                    <div className="text-error">
                                      -R$ {item.valorDesconto.toFixed(2).replace(".", ",")}
                                    </div>
                                  )}
                                  <div className="font-semibold text-foreground w-20">
                                    R$ {item.subTotal.toFixed(2).replace(".", ",")}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Summary */}
                          <div className="border-t border-border/50 pt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span className="font-medium">
                                R$ {sale.vrSubTotal.toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-semibold text-lg">
                                R$ {sale.vrTotal.toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pago:</span>
                              <span className="font-medium">
                                R$ {sale.vrPago.toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
