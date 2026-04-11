export interface LogEntry {
  date: string;
  time: string;
  type: string;
  description: string;
  raw: string;
  lineNumber: number;
  metadata?: Record<string, string>;
}

export type NoteStatus = "approved" | "contingency" | "error" | "inutilizada" | "cancelada";

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
  // Relationship fields
  replacedNote?: string;  // Note number that was inutilized and replaced by this contingency note
  replacedByNote?: string; // Note number that replaced this inutilized note with contingency
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

/** Pretty-print event blocks with proper formatting and line breaking */
export function formatEventBlock(block: string): string {
  const trimmed = block.trim();
  let formatted = trimmed;
  
  // First, check if it contains XML/HTML tags
  if (trimmed.includes("<") && trimmed.includes(">")) {
    try {
      // Try to format as XML
      formatted = formatXml(trimmed);
      return formatted;
    } catch {
      // If formatXml fails, continue with other formats
    }
  }
  
  // Try to detect and format JSON
  // 1. Check if it's pure JSON
  if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && (trimmed.endsWith("}") || trimmed.endsWith("]"))) {
    try {
      const parsed = JSON.parse(trimmed);
      formatted = JSON.stringify(parsed, null, 2);
      return formatted;
    } catch {
      // Not valid JSON, continue with other formats
    }
  }

  // 2. Try to extract JSON from within the string (e.g., "...{json}...")
  if (trimmed.includes("{") || trimmed.includes("[")) {
    // Find the most complete JSON object/array in the string
    const segments = trimmed.split(/(?=[{\[])/);
    
    for (const segment of segments) {
      try {
        // Try to find closing brace/bracket
        let braceCount = 0;
        let bracketCount = 0;
        let endIndex = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < segment.length; i++) {
          const char = segment[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === "\\") {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === "{") braceCount++;
            if (char === "}") braceCount--;
            if (char === "[") bracketCount++;
            if (char === "]") bracketCount--;
            
            if (braceCount === 0 && bracketCount === 0 && (char === "}" || char === "]")) {
              endIndex = i + 1;
              break;
            }
          }
        }
        
        if (endIndex > 0) {
          const jsonStr = segment.substring(0, endIndex).trim();
          const parsed = JSON.parse(jsonStr);
          formatted = JSON.stringify(parsed, null, 2);
          return formatted;
        }
      } catch {
        // Continue to next segment
      }
    }
  }

  // 3. Try to detect escaped JSON strings
  if (trimmed.includes("\\{") || trimmed.includes("\\[")) {
    try {
      // Try to unescape and parse
      const unescaped = trimmed
        .replace(/\\"/g, '"')
        .replace(/\\\//g, "/")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t");
      
      const jsonMatch = unescaped.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        formatted = JSON.stringify(parsed, null, 2);
        return formatted;
      }
    } catch {
      // Continue with plaintext formatting
    }
  }

  // Break long lines to prevent horizontal scrolling (max 120 chars per line)
  const lines = formatted.split("\n");
  const maxLineLength = 120;
  const brokenLines: string[] = [];
  
  for (const line of lines) {
    if (line.length > maxLineLength) {
      // For long lines, break them up while preserving indentation
      const indentation = line.match(/^\s*/)?.[0] || "";
      const content = line.substring(indentation.length);
      const words = content.split(/(\s+)/);
      
      let currentLine = indentation;
      for (const word of words) {
        if ((currentLine + word).length > maxLineLength && currentLine.trim().length > 0) {
          brokenLines.push(currentLine);
          currentLine = indentation + word;
        } else {
          currentLine += word;
        }
      }
      if (currentLine.trim().length > 0) {
        brokenLines.push(currentLine);
      }
    } else {
      brokenLines.push(line);
    }
  }
  
  return brokenLines.join("\n");
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
        replacedNote: undefined,
        replacedByNote: undefined,
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
          note.chaveAcesso = chaveMatch[1];
          // Only change status to error if not already in contingency
          // This allows contingency notes with errors to remain as contingency
          if (note.status !== "contingency" && note.status !== "inutilizada") {
            note.status = "error";
          }
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
            note.emissionType = "9"; // Mark as offline emission (contingency)
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
              meta["Ação Automática"] = "A nota original será posteriormente inutilizada";
              note.events.push({
                ...entry,
                type: "CONTINGÊNCIA",
                description: `⚠️ ${motivo}`,
                metadata: meta,
              });
            }
          } else if (situacao === "301") {
            // Inutilização — only add once
            if (note.status !== "error") note.status = "approved"; // Mark as resolved
            if (!note.events.some(e => e.type === "INUTILIZAÇÃO")) {
              const meta: Record<string, string> = {
                "Situação": `${situacao} – Inutilizada`,
                "Motivo": motivo,
              };
              if (chaveMatch) meta["Chave de Acesso"] = chaveMatch[1];
              if (dhRecbto) meta["Data Processamento"] = dhRecbto;
              meta["Detalhes"] = "Nota inutilizada no sistema fiscal. Uma nota em contingência foi gerada em seu lugar.";
              note.events.push({
                ...entry,
                type: "INUTILIZAÇÃO",
                description: `📋 ${motivo}`,
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
            // Check if this is a cancellation or rejection
            const isCancellation = 
              motivo.toLowerCase().includes("cancelad") || 
              motivo.toLowerCase().includes("cancela") ||
              motivo.toLowerCase().includes("indisponível") ||
              parseInt(situacao, 10) > 500;
            
            const meta: Record<string, string> = {
              "Código Situação": situacao,
              "Motivo": motivo,
            };
            if (chaveMatch) meta["Chave de Acesso"] = chaveMatch[1];
            if (dhRecbto) meta["Data"] = dhRecbto;
            note.events.push({
              ...entry,
              type: isCancellation ? "CANCELAMENTO" : "REJEIÇÃO",
              description: isCancellation ? `❌ Cancelada: ${motivo}` : `❌ Situação ${situacao}: ${motivo}`,
              metadata: meta,
            });
            if (note.status !== "error") {
              note.status = isCancellation ? "cancelada" : "error";
            }
            note.contingencyReason = motivo;
          }
        }
      }
    }

    // ─── XML flow events (CRIADO → ENVIADO → CONFIRMADO) ───
    if (["XML CRIADO", "XML ENVIADO", "XML CONFIRMADO"].includes(entry.type)) {
      // Skip if this is a JSON status update (alteraStatus) or a log message (dadosUsuarioLog)
      // These are not actual XML flow events, just metadata updates
      if (desc.includes("alteraStatus") || desc.includes("dadosUsuarioLog")) {
        return;
      }

      // ─── Extract NF-e data from XML CRIADO (NFe type) ───
      if (entry.type === "XML CRIADO" && desc.includes("<NFe ")) {
        // This is a full NF-e XML from contingency authorization or backup
        const nfeStart = desc.indexOf("<?xml");
        if (nfeStart !== -1) {
          const nfeEnd = desc.indexOf("</NFe>") + 6;
          const nfeXml = desc.substring(nfeStart, nfeEnd);
          
          // Extract nNF to identify the note
          const nnfMatch = nfeXml.match(/<nNF>(\d+)<\/nNF>/);
          if (nnfMatch) {
            const noteNum = nnfMatch[1];
            const note = getNote(noteNum);
            
            // Store the complete NF-e XML for viewing
            note.nfeXml = nfeXml;
            
            // Extract chaveAcesso from infNFe Id
            const chaveFromId = nfeXml.match(/Id="NFe(\d{44})"/);
            if (chaveFromId && !note.chaveAcesso) {
              note.chaveAcesso = chaveFromId[1];
            }
            
            // Extract valor (vNF)
            if (!note.valor) {
              const vNFMatch = nfeXml.match(/<vNF>([^<]+)<\/vNF>/);
              if (vNFMatch) note.valor = parseFloat(vNFMatch[1]);
            }
            
            // Extract dhEmissao
            if (!note.dhEmissao) {
              const dhMatch = nfeXml.match(/<dhEmi>([^<]+)<\/dhEmi>/);
              if (dhMatch) note.dhEmissao = dhMatch[1];
            }
            
            // Extract tPag (payment method)
            if (!note.formaPagamento) {
              const tpagMatch = nfeXml.match(/<tPag>(\d+)<\/tPag>/);
              if (tpagMatch) note.formaPagamento = TPAG_MAP[tpagMatch[1]] ?? `Código ${tpagMatch[1]}`;
            }
            
            // Extract itens from det blocks
            if (note.itens.length === 0) {
              note.itens = parseItens(nfeXml);
            }
            
            // Check if contingency (tpEmis=9)
            const tpEmisMatch = nfeXml.match(/<tpEmis>9<\/tpEmis>/);
            if (tpEmisMatch) {
              note.contingency = true;
              note.emissionType = "9";
              if (note.status !== "error") note.status = "contingency";
              const justMatch = nfeXml.match(/<xJust>([^<]*)<\/xJust>/);
              if (justMatch && !note.contingencyReason) {
                note.contingencyReason = justMatch[1];
              }
            }
          }
        }
        // Don't continue to process this further as a regular XML CRIADO event
        return;
      }

      // Try to find nNF in the XML content for regular XML flow events
      const nnfMatch = desc.match(/<nNF>(\d+)<\/nNF>/);
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
        
        // Check if this event type already exists for this note to avoid duplicates
        const eventTypePrefix = entry.type.replace(" ", "");
        const eventExists = note.events.some(e => e.description?.includes(eventTypePrefix));
        
        if (!eventExists) {
          note.events.push({
            ...entry,
            description: `${label} — Nota #${noteNum}`,
          });
        }

        // ─── Extract data from <venda> XML (contingency or backup sales) ───
        if (entry.type === "XML CRIADO" && desc.includes("<venda>")) {
          // Store raw XML for viewing (only if not already set with NF-e)
          if (!note.nfeXml) {
            const xmlStart = desc.indexOf("<?xml");
            if (xmlStart !== -1) note.nfeXml = desc.substring(xmlStart);
          }
          // Extract chave_acesso (for contingency linking)
          if (!note.chaveAcesso) {
            const chaveMatch = desc.match(/<chave_acesso>(\d{44})<\/chave_acesso>/);
            if (chaveMatch) note.chaveAcesso = chaveMatch[1];
          }
          // Extract vrTotal value
          if (!note.valor) {
            const vrTotalMatch = desc.match(/<vrTotal>([\d.]+)<\/vrTotal>/);
            if (vrTotalMatch) note.valor = parseFloat(vrTotalMatch[1]);
          }
          // Extract dataHora as dhEmissao
          if (!note.dhEmissao) {
            const dataHoraMatch = desc.match(/<dataHora>(\d+)<\/dataHora>/);
            if (dataHoraMatch) {
              const timestamp = parseInt(dataHoraMatch[1], 10);
              const date = new Date(timestamp);
              note.dhEmissao = date.toISOString().split('T')[0] + 'T' + date.toISOString().split('T')[1];
            }
          }
          // Extract itens from venda (most important for contingency!)
          if (note.itens.length === 0) {
            const itensMatch = desc.match(/<itens>([\s\S]*?)<\/itens>/);
            if (itensMatch) {
              note.itens = parseItens(itensMatch[1]);
            }
          }
          // Check if this is contingency emission
          if (!note.contingency) {
            const tipoEmissaoMatch = desc.match(/<tipo_emissao>9<\/tipo_emissao>/);
            if (tipoEmissaoMatch) {
              note.contingency = true;
              note.emissionType = "9";
              if (note.status !== "error") note.status = "contingency";
              const justMatch = desc.match(/<justif_contingencia>([^<]*)<\/justif_contingencia>/);
              if (justMatch && justMatch[1]) {
                note.contingencyReason = justMatch[1];
              }
            }
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

    // ─── processaSitCanc — status check events (SEFAZ verification) ───
    if (entry.type === "processaSitCanc") {
      const statusCodeMatch = desc.match(/Status[:\s]+(\d+)/);
      const chaveMatch = desc.match(/(\d{44})/);
      
      if (chaveMatch) {
        const noteNum = noteFromChave(chaveMatch[1]);
        const statusCode = statusCodeMatch ? statusCodeMatch[1] : "";
        
        if (noteNum) {
          const note = getNote(noteNum);
          note.chaveAcesso = chaveMatch[1];
          
          // Status 704 = not authorized/not found at SEFAZ
          // This is the trigger for creating the inutilization
          if (statusCode === "704") {
            note.events.push({
              ...entry,
              type: "EVENTO",
              description: `🔍 Verificação SEFAZ: Nota não encontrada — será inutilizada`,
              metadata: {
                "Chave de Acesso": chaveMatch[1],
                "Status SEFAZ": "704 (Não Autorizada)",
                "Ação": "Iniciando processo de inutilização automaticamente",
              },
            });
          } else if (statusCode) {
            note.events.push({
              ...entry,
              type: "EVENTO",
              description: `🔍 Verificação SEFAZ: Status ${statusCode}`,
              metadata: {
                "Chave de Acesso": chaveMatch[1],
                "Status SEFAZ": statusCode,
              },
            });
          }
        }
      }
    }

    // ─── inutNFe blocks — capture inutilization XML events ───
    if (entry.type === "XML CRIADO" && desc.includes("<inutNFe")) {
      // Extract note numbers from inutilization range
      const nNFIniMatch = desc.match(/<nNFIni>(\d+)<\/nNFIni>/);
      const nNFFinMatch = desc.match(/<nNFFin>(\d+)<\/nNFFin>/);
      const xJustMatch = desc.match(/<xJust>([^<]+)<\/xJust>/);
      const justificativa = xJustMatch ? xJustMatch[1] : "Inutilizada";
      
      if (nNFIniMatch) {
        const nNFStart = parseInt(nNFIniMatch[1], 10);
        const nNFEnd = nNFFinMatch ? parseInt(nNFFinMatch[1], 10) : nNFStart;
        
        for (let nNF = nNFStart; nNF <= nNFEnd; nNF++) {
          const note = getNote(String(nNF));
          
          // Only add event if not already added
          if (!note.events.some(e => e.type === "INUTILIZAÇÃO")) {
            note.events.push({
              ...entry,
              type: "INUTILIZAÇÃO",
              description: `📋 ${justificativa}`,
              metadata: {
                "Número NF": String(nNF),
                "Motivo": justificativa,
                "Detalhes": desc.includes("contigencia") ? "Nota original substituída por nota em contingência" : "Nota inutilizada no sistema",
              },
            });
          }
          // Always update status to inutilizada (moved outside the if)
          note.status = "inutilizada";
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

  // ─── Link inutilized notes with their replacement contingency notes ───
  // When a note is inutilized due to contingency, find the next contingency note that replaced it
  notesMap.forEach((note, noteNumber) => {
    if (note.status === "inutilizada") {
      // Check if this note was replaced by a contingency note
      const inutEvent = note.events.find((e) => e.type === "INUTILIZAÇÃO");
      if (inutEvent && inutEvent.metadata?.["Detalhes"]?.includes("contingência")) {
        // Find the next contingency note (with higher number)
        const currentNum = parseInt(noteNumber, 10);
        let replacementNote: Note | null = null;
        let closestNum = Infinity;

        notesMap.forEach((other, otherNum) => {
          const otherNumInt = parseInt(otherNum, 10);
          if (otherNumInt > currentNum && otherNumInt < closestNum && other.contingency && other.status === "contingency") {
            replacementNote = other;
            closestNum = otherNumInt;
          }
        });

        if (replacementNote) {
          note.replacedByNote = replacementNote.number;
          replacementNote.replacedNote = noteNumber;
        }
      }
    }
  });

  // ─── Post-processing: remove fictitious notes (only JSON status, no real XML data) ───
  // A note is considered fictitious if:
  // - No nfeXml (no actual NF-e authorization document)
  // - No itens (no products recorded)
  // - All events are just JSON status updates (not real XML events)
  notesMap.forEach((note, noteNumber) => {
    // Check if note has ANY real XML events (not just JSON alteraStatus)
    const hasRealXmlEvent = note.events.some(
      (e) => e.type === "XML CRIADO" || e.type === "XML ENVIADO" || e.type === "XML CONFIRMADO" ||
             (e.description && e.description.includes("XML Criado")) ||
             (e.description && e.description.includes("XML Enviado"))
    );

    // If note has no XML, no items, and no real XML events → remove it
    if (!note.nfeXml && note.itens.length === 0 && !hasRealXmlEvent) {
      notesMap.delete(noteNumber);
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
