export interface LogEntry {
  date: string;
  time: string;
  type: string;
  description: string;
  raw: string;
  lineNumber: number;
  metadata?: Record<string, string>;
}

export type NoteStatus = "approved" | "contingency" | "error";

export interface NoteItem {
  numero: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface Note {
  number: string;
  serie: string;         // Note series (positions 22-24 of chaveAcesso)
  status: NoteStatus;
  contingency: boolean;
  contingencyReason: string;
  chaveAcesso: string;
  emissionType: string; // "1" = normal, "9" = contingência
  errors: LogEntry[];
  events: LogEntry[];
  // Enhanced fields
  nfeXml: string;        // Raw NF-e XML (from XML CRIADO Linha 506)
  valor: number;         // vNF total
  protocolo: string;     // Authorization protocol
  formaPagamento: string;// Payment method label
  itens: NoteItem[];     // Note items
  dhEmissao: string;     // Emission date/time
}

export interface Instability {
  time: string;
  description: string;
  lineNumber: number;
}

export interface ParsedLog {
  entries: LogEntry[];
  notes: Map<string, Note>;
  errors: LogEntry[];
  instabilities: Instability[];
  pdvStatus: "ok" | "error";
  pdvVersion: string;
  terminal: string;
  rawContent: string;
  // New header/session fields
  osInfo: string;           // e.g. "Windows 10"
  jreVersion: string;       // e.g. "1.8.0_451"
  systemCode: string;       // ERP system code, e.g. "sj2g802f"
  pdvLoginTime: string;     // Timestamp of first [PDV] Efetuou Login
  pdvCloseTime: string;     // Timestamp of [PDV] PDV Encerrado (or empty)
  pdvCloseIsLast: boolean;  // true = derived from last log line (no close event)
}

const TPAG_MAP: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de Crédito",
  "04": "Cartão de Débito",
  "05": "Crédito Loja",
  "10": "Vale Alimentação",
  "11": "Vale Refeição",
  "12": "PIX / Transferência",
  "13": "Vale Presente",
  "14": "Vale Combustível",
  "15": "Boleto Bancário",
  "16": "Depósito Bancário",
  "17": "PIX Instantâneo",
  "18": "Transferência Bancária",
  "19": "Cashback / Fidelidade",
  "20": "PIX QR Code",
  "90": "Sem Pagamento",
  "99": "Outros",
};

/** Decode HTML entities and unescape JSON string escapes */
function decodeXml(raw: string): string {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

/** Extract first matching tag value from an XML string */
function xmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`));
  return m ? m[1].trim() : "";
}

/** Parse items from NF-e XML */
function parseItens(xml: string): NoteItem[] {
  const items: NoteItem[] = [];
  const detRegex = /<det\s+nItem="(\d+)">([\s\S]*?)<\/det>/g;
  let m: RegExpExecArray | null;
  while ((m = detRegex.exec(xml)) !== null) {
    const num = parseInt(m[1], 10);
    const block = m[2];
    items.push({
      numero: num,
      codigo: xmlTag(block, "cProd"),
      descricao: xmlTag(block, "xProd"),
      ncm: xmlTag(block, "NCM"),
      cfop: xmlTag(block, "CFOP"),
      unidade: xmlTag(block, "uCom"),
      quantidade: parseFloat(xmlTag(block, "qCom") || "0"),
      valorUnitario: parseFloat(xmlTag(block, "vUnCom") || "0"),
      valorTotal: parseFloat(xmlTag(block, "vProd") || "0"),
    });
  }
  return items;
}

/** Pretty-print XML with proper indentation */
export function formatXml(xml: string): string {
  let result = "";
  let depth = 0;
  const indent = "  ";

  // First, normalize spacing around tags
  xml = xml.replace(/>\s+</g, "><");

  // Split by tags while keeping them
  const tokens = xml.split(/(<[^>]+>)/);

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (!token.trim()) {
      i++;
      continue;
    }

    const isClosing = token.startsWith("</");
    const isSelfClosing = token.endsWith("/>");
    const isOpening = token.startsWith("<") && !isClosing && !isSelfClosing;

    // Check if this is a simple value: <tag>value</tag>
    if (isOpening && i + 2 < tokens.length) {
      const nextToken = tokens[i + 1];
      const followingToken = tokens[i + 2];
      
      // Pattern: opening tag + simple text + closing tag
      if (
        nextToken &&
        !nextToken.trim().startsWith("<") &&
        nextToken.trim().length > 0 &&
        followingToken &&
        followingToken.startsWith("</")
      ) {
        // This is a simple value line
        result += indent.repeat(depth) + token + nextToken.trim() + followingToken + "\n";
        i += 3;
        continue;
      }
    }

    // Regular tag processing
    if (isClosing) depth = Math.max(0, depth - 1);

    // Add indentation and token
    result += indent.repeat(depth) + token + "\n";

    // Increase depth for opening tags (but not self-closing)
    if (isOpening) depth++;
    
    i++;
  }

  return result.trim();
}

const LINE_REGEX = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s+\[([^\]]*)\]\s*(.*)$/;

// Extract nNF (note number) from a 44-digit chaveAcesso: positions 25-33 (9 digits)
function noteFromChave(chave: string): string | null {
  if (chave.length === 44 && /^\d{44}$/.test(chave)) {
    const num = parseInt(chave.substring(25, 34), 10);
    if (num > 0) return String(num);
  }
  return null;
}

// Extract série (series) from a 44-digit chaveAcesso: positions 22-24 (3 digits)
function serieFromChave(chave: string): string {
  if (chave.length === 44 && /^\d{44}$/.test(chave)) {
    return String(parseInt(chave.substring(22, 25), 10));
  }
  return "";
}

export function parseLog(content: string): ParsedLog {
  const rawLines = content.split(/\r?\n/);

  // ─── Pre-process: join continuation lines (multi-line XML blocks) ───
  const lines: string[] = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/.test(trimmed)
      || /^-{10,}/.test(trimmed)
      || /^(INFO|SO:|VERS)/i.test(trimmed)) {
      lines.push(trimmed);
    } else if (lines.length > 0) {
      lines[lines.length - 1] += " " + trimmed;
    } else {
      lines.push(trimmed);
    }
  }

  const entries: LogEntry[] = [];
  const errors: LogEntry[] = [];
  const instabilities: Instability[] = [];
  const notesMap = new Map<string, Note>();
  let hasCriticalError = false;
  let pdvVersion = "";
  let terminal = "";
  let osInfo = "";
  let jreVersion = "";
  let systemCode = "";
  let pdvLoginTime = "";
  let pdvCloseTime = "";
  let lastEntryTime = "";

  // Helper to get or create note
  function getNote(num: string): Note {
    if (!notesMap.has(num)) {
      notesMap.set(num, {
        number: num,
        serie: "",
        status: "approved",
        contingency: false,
        contingencyReason: "",
        chaveAcesso: "",
        emissionType: "1",
        errors: [],
        events: [],
        nfeXml: "",
        valor: 0,
        protocolo: "",
        formaPagamento: "",
        itens: [],
        dhEmissao: "",
      });
    }
    return notesMap.get(num)!;
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Extract PDV version from header
    if (/VERS.O PDV:/i.test(trimmed)) {
      const vMatch = trimmed.match(/VERS.O PDV:\s*(.+)/i);
      if (vMatch) pdvVersion = vMatch[1].trim();
      return;
    }

    // Extract OS and JRE from header line "SO: ... JRE: ..."
    if (/^\s*SO:/i.test(trimmed)) {
      const soMatch = trimmed.match(/SO:\s*([^J]+?)(?=\s+JRE:|$)/i);
      if (soMatch) osInfo = soMatch[1].trim();
      const jreMatch = trimmed.match(/JRE:\s*(\S+)/i);
      if (jreMatch) jreVersion = jreMatch[1].trim();
      return;
    }

    // Extract terminal
    if (/TERMINAL SALVO/i.test(trimmed)) {
      const tMatch = trimmed.match(/TERMINAL SALVO\s*-\s*(\d+)/i);
      if (tMatch) terminal = tMatch[1];
    }

    // Extract system code from "SISTEMA ERP - https://.../<code>/"
    if (!systemCode && /SISTEMA ERP/i.test(trimmed)) {
      const urlMatch = trimmed.match(/https?:\/\/[^/]+\/([^/\s]+)\/?/i);
      if (urlMatch) systemCode = urlMatch[1];
    }

    const match = trimmed.match(LINE_REGEX);
    if (!match) return;

    const entry: LogEntry = {
      date: match[1],
      time: match[2],
      type: match[3] || "INFO",
      description: match[4],
      raw: trimmed,
      lineNumber: index + 1,
    };

    entries.push(entry);

    // Track last logged timestamp
    lastEntryTime = `${entry.date} ${entry.time}`;

    const desc = entry.description;
    const fullLine = trimmed;

    // ─── PDV Login / Close detection ───
    if (desc.includes("[PDV] Efetuou Login") && !pdvLoginTime) {
      pdvLoginTime = `${entry.date} ${entry.time}`;
    }
    if (desc.includes("[PDV] PDV Encerrado") && !pdvCloseTime) {
      pdvCloseTime = `${entry.date} ${entry.time}`;
    }

    // ─── ERROR detection ───
    if (entry.type === "ERROR") {
      errors.push(entry);
      hasCriticalError = true;

      // Try to associate error with a note via chaveAcesso in the line
      const chaveMatch = fullLine.match(/(\d{44})/);
      if (chaveMatch) {
        const noteNum = noteFromChave(chaveMatch[1]);
        if (noteNum) {
          const note = getNote(noteNum);
          note.errors.push(entry);
          note.status = "error";
          note.chaveAcesso = chaveMatch[1];
        }
      }
    }

    // ─── COO NFCE MANTIDO ───
    const cooMatch = desc.match(/COO\s+NFCE\s+\S+\s+-\s+(\d+)/i);
    if (cooMatch) {
      getNote(cooMatch[1]); // just register it
    }

    // ─── XML BACKUP lines contain full venda XML with note data ───
    if (entry.type.startsWith("XML BACKUP-")) {
      const chave = entry.type.replace("XML BACKUP-", "");
      const noteNum = noteFromChave(chave);
      if (noteNum) {
        const note = getNote(noteNum);
        note.chaveAcesso = chave;
        note.events.push({
          ...entry,
          type: "BACKUP",
          description: `Backup XML gerado — Nota #${noteNum}`,
        });

        // Check tpEmis in content
        const tpEmisMatch = desc.match(/tpEmis>(\d)/);
        if (tpEmisMatch) {
          note.emissionType = tpEmisMatch[1];
          if (tpEmisMatch[1] === "9") {
            note.contingency = true;
            if (note.status !== "error") note.status = "contingency";
            if (!note.contingencyReason) {
              note.contingencyReason = "Emissão em contingência offline (tpEmis=9)";
            }
          }
        }
      }
    }

    // ─── updateDadosNFCe — status update with situacao/motivo ───
    if (entry.type === "updateDadosNFCe") {
      const chaveMatch = desc.match(/(\d{44})/);
      if (chaveMatch) {
        const noteNum = noteFromChave(chaveMatch[1]);
        if (noteNum) {
          const note = getNote(noteNum);
          note.chaveAcesso = chaveMatch[1];
          note.events.push({
            ...entry,
            type: "UPDATE",
            description: "Chave NFC-e atualizada",
            metadata: {
              "Chave de Acesso": chaveMatch[1],
              "Ação": "Registro enviado ao ERP para vinculação da chave autorizada",
            },
          });
        }
      }
    }

    // ─── XML CRIADO with alteraStatus JSON (contains situacao/motivo) ───
    if (desc.includes('"situacao"') && desc.includes('"motivo"')) {
      const situacaoMatch = desc.match(/"situacao":"(\d+)"/);
      const motivoMatch = desc.match(/"motivo":"([^"]+)"/);
      const chaveMatch = desc.match(/"chaveAcesso":"(\d{44})"/);
      const protocoloMatch = desc.match(/"protocolo":"([^"]+)"/);

      if (chaveMatch) {
        const noteNum = noteFromChave(chaveMatch[1]);
        if (noteNum) {
          const note = getNote(noteNum);
          note.chaveAcesso = chaveMatch[1];

          // Extract protocolo
          if (protocoloMatch && !note.protocolo) {
            note.protocolo = protocoloMatch[1];
          }

          // Extract the authorized NF-e XML from the "xml" field
          if (!note.nfeXml) {
            const xmlFieldMatch = desc.match(/"xml":"((?:[^"\\]|\\.)*)"/);
            if (xmlFieldMatch) {
              note.nfeXml = decodeXml(xmlFieldMatch[1]);
              // Extract items from the decoded XML if not already extracted
              if (note.itens.length === 0) {
                note.itens = parseItens(note.nfeXml);
              }
              // Extract valor if not already set
              if (!note.valor) {
                const vNFMatch = note.nfeXml.match(/vNF[^>]*>([^<]+)</);
                if (vNFMatch) note.valor = parseFloat(vNFMatch[1]);
              }
              // Extract dhEmissao if not already set
              if (!note.dhEmissao) {
                const dhMatch = note.nfeXml.match(/dhEmi[^>]*>([^<]+)</);
                if (dhMatch) note.dhEmissao = dhMatch[1];
              }
              // Extract payment method if not already set
              if (!note.formaPagamento) {
                const tpagMatch = note.nfeXml.match(/tPag[^>]*>(\d+)</);
                if (tpagMatch) note.formaPagamento = TPAG_MAP[tpagMatch[1]] ?? `Código ${tpagMatch[1]}`;
              }
            }
          }

          const situacao = situacaoMatch ? situacaoMatch[1] : "";
          const motivo = motivoMatch ? motivoMatch[1] : "";

          // Extract dhRecbto from escaped XML inside the JSON payload
          const dhRecbtoMatch = desc.match(/dhRecbto(?:&gt;|>)([^&<"\\]+)/);
          const dhRecbto = dhRecbtoMatch
            ? dhRecbtoMatch[1].replace("T", " ").replace(/-03:00$/, "")
            : "";
          const verAplicMatch = desc.match(/verAplic(?:&gt;|>)([^&<"\\]+)/);
          const verAplic = verAplicMatch ? verAplicMatch[1] : "";
          // Detect which flow step issued this status (to avoid triplicating events)
          const flowStep: string =
            entry.type === "XML CRIADO" ? "Criado"
            : entry.type === "XML ENVIADO" ? "Enviado"
            : entry.type === "XML CONFIRMADO" ? "Confirmado"
            : "";

          if (situacao === "13") {
            // Autorizado — only add once (on CRIADO), update metadata on subsequent steps
            if (note.status !== "error") note.status = "approved";
            const existing = note.events.find(e => e.type === "AUTORIZADO");
            if (!existing) {
              const meta: Record<string, string> = {
                "Motivo": motivo,
                "Situação": `${situacao} – Autorizado o uso da NF-e`,
              };
              if (protocoloMatch) meta["Protocolo"] = protocoloMatch[1];
              if (chaveMatch) meta["Chave de Acesso"] = chaveMatch[1];
              if (dhRecbto) meta["Data Recebimento SEFAZ"] = dhRecbto;
              if (verAplic) meta["Versão SEFAZ"] = verAplic;
              meta["Etapa"] = flowStep || entry.type;
              note.events.push({
                ...entry,
                type: "AUTORIZADO",
                description: `✅ ${motivo}`,
                metadata: meta,
              });
            } else if (existing.metadata) {
              // Just track which steps confirmed
              const prev = existing.metadata["Confirmado em"] ?? "";
              if (flowStep && !prev.includes(flowStep)) {
                existing.metadata["Confirmado em"] = prev
                  ? `${prev} → ${flowStep}`
                  : flowStep;
              }
            }
          } else if (situacao === "302") {
            // Contingência — only add once
            note.contingency = true;
            note.contingencyReason = motivo || "Contingência liberada pelo PDV";
            if (note.status !== "error") note.status = "contingency";
            if (!note.events.some(e => e.type === "CONTINGÊNCIA")) {
              const meta: Record<string, string> = {
                "Situação": `${situacao} – Contingência`,
                "Motivo": motivo,
              };
              if (chaveMatch) meta["Chave de Acesso"] = chaveMatch[1];
              if (dhRecbto) meta["Data Ocorrência"] = dhRecbto;
              meta["Tipo Emissão"] = "Offline (tpEmis=9)";
              meta["Detalhes"] = "O PDV identificou inconsistência nos dados e emitiu a nota em modo contingência offline. A chave ainda precisa ser autorizada pela SEFAZ quando a conexão for restabelecida.";
              note.events.push({
                ...entry,
                type: "CONTINGÊNCIA",
                description: `⚠️ ${motivo}`,
                metadata: meta,
              });
            }
          } else if (situacao === "16") {
            if (!note.events.some(e => e.type === "EVENTO" && e.description === motivo)) {
              note.events.push({
                ...entry,
                type: "EVENTO",
                description: motivo,
              });
            }
          } else if (situacao) {
            // Unknown/rejection
            const meta: Record<string, string> = {
              "Código Situação": situacao,
              "Motivo": motivo,
            };
            if (chaveMatch) meta["Chave de Acesso"] = chaveMatch[1];
            if (dhRecbto) meta["Data"] = dhRecbto;
            note.events.push({
              ...entry,
              type: "REJEIÇÃO",
              description: `❌ Situação ${situacao}: ${motivo}`,
              metadata: meta,
            });
            if (note.status !== "error") note.status = "error";
            note.contingencyReason = motivo;
          }
        }
      }
    }

    // ─── XML flow events (CRIADO → ENVIADO → CONFIRMADO) ───
    if (["XML CRIADO", "XML ENVIADO", "XML CONFIRMADO"].includes(entry.type)) {
      // Try to find nNF in the XML content
      const nnfMatch = desc.match(/nNF>(\d+)/);
      // Also try to find chaveAcesso as fallback
      const chaveMatch = nnfMatch ? null : desc.match(/(\d{44})/);
      const eventChave = chaveMatch ? chaveMatch[1] : null;
      const noteNum = nnfMatch ? nnfMatch[1] : (eventChave ? noteFromChave(eventChave) : null);
      
      if (noteNum) {
        const note = getNote(noteNum);
        if (eventChave) note.chaveAcesso = eventChave;
        
        const label =
          entry.type === "XML CRIADO" ? "XML Criado" :
          entry.type === "XML ENVIADO" ? "XML Enviado" :
          "XML Confirmado";
        note.events.push({
          ...entry,
          description: `${label} — Nota #${noteNum}`,
        });

        // ─── Extract NF-e data from XML CRIADO (NFe type) ───
        if (entry.type === "XML CRIADO" && desc.includes("<NFe ")) {
          // Store raw XML for viewing
          if (!note.nfeXml) {
            const nfeStart = desc.indexOf("<?xml");
            if (nfeStart !== -1) note.nfeXml = desc.substring(nfeStart);
          }
          // Extract valor
          if (!note.valor) {
            const vNFMatch = desc.match(/vNF>([\d.]+)/);
            if (vNFMatch) note.valor = parseFloat(vNFMatch[1]);
          }
          // Extract dhEmissao
          if (!note.dhEmissao) {
            const dhMatch = desc.match(/dhEmi>([^<]+)/);
            if (dhMatch) note.dhEmissao = dhMatch[1];
          }
          // Extract payment method
          if (!note.formaPagamento) {
            const tpagMatch = desc.match(/tPag>(\d+)/);
            if (tpagMatch) note.formaPagamento = TPAG_MAP[tpagMatch[1]] ?? `Código ${tpagMatch[1]}`;
          }
          // Extract itens
          if (note.itens.length === 0) {
            note.itens = parseItens(desc);
          }
        }

        // Check tpEmis in this line too
        const tpMatch = desc.match(/tpEmis>(\d)/);
        if (tpMatch && tpMatch[1] === "9") {
          note.contingency = true;
          note.emissionType = "9";
          if (note.status !== "error") note.status = "contingency";
          if (!note.contingencyReason) {
            note.contingencyReason = "Emissão em contingência offline (tpEmis=9)";
          }
        }
      }
    }

    // ─── copyArqTemp — copy events ───
    if (entry.type === "copyArqTemp") {
      const chaveMatch = desc.match(/(\d{44})/);
      if (chaveMatch) {
        const noteNum = noteFromChave(chaveMatch[1]);
        if (noteNum) {
          const note = getNote(noteNum);
          note.events.push({
            ...entry,
            description: `Cópia para ERP — Nota #${noteNum}`,
          });
        }
      }
    }

    // ─── Instability detection ───
    if (
      /timeout|timed?\s*out|conex.o\s+recusada|connection\s+refused|socket|unreachable/i.test(desc) ||
      /j.\s+est.\s+sendo\s+usado/i.test(desc) ||
      /falha|fail/i.test(desc)
    ) {
      instabilities.push({
        time: `${entry.date} ${entry.time}`,
        description: desc.length > 200 ? desc.substring(0, 200) + "..." : desc,
        lineNumber: entry.lineNumber,
      });
    }
  });

  // ─── Post-processing: detect instabilities from error patterns ───
  errors.forEach((err) => {
    if (!instabilities.find(i => i.lineNumber === err.lineNumber)) {
      instabilities.push({
        time: `${err.date} ${err.time}`,
        description: err.description.length > 200 ? err.description.substring(0, 200) + "..." : err.description,
        lineNumber: err.lineNumber,
      });
    }
  });

  // ─── Post-processing: fill serie from chaveAcesso or nfeXml ───
  notesMap.forEach((note) => {
    if (!note.serie) {
      if (note.chaveAcesso) {
        note.serie = serieFromChave(note.chaveAcesso);
      }
      if (!note.serie && note.nfeXml) {
        const serieXmlMatch = note.nfeXml.match(/<serie>(\d+)<\/serie>/);
        if (serieXmlMatch) note.serie = String(parseInt(serieXmlMatch[1], 10));
      }
    }
  });

  const pdvCloseIsLast = !pdvCloseTime;
  const resolvedCloseTime = pdvCloseTime || lastEntryTime;

  return {
    entries,
    notes: notesMap,
    errors,
    instabilities,
    pdvStatus: hasCriticalError ? "error" : "ok",
    pdvVersion,
    terminal,
    rawContent: content,
    osInfo,
    jreVersion,
    systemCode,
    pdvLoginTime,
    pdvCloseTime: resolvedCloseTime,
    pdvCloseIsLast,
  };
}
