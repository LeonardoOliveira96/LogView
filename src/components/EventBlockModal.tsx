import { useEffect, useRef, useState } from "react";
import { X, Copy, Check, FileText } from "lucide-react";
import { formatEventBlock } from "@/lib/logParser";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import plaintext from "highlight.js/lib/languages/plaintext";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("plaintext", plaintext);

const contentStyle = document.createElement("style");
contentStyle.textContent = `
  .event-block-content {
    overflow-x: hidden !important;
    max-width: 100% !important;
  }
  .event-block-content pre {
    overflow-x: hidden !important;
    max-width: 100% !important;
    word-break: break-all !important;
    overflow-wrap: break-word !important;
  }
  .event-block-content code,
  .event-block-content .hljs {
    word-break: break-all !important;
    overflow-wrap: break-word !important;
    max-width: 100% !important;
  }
  .event-block-content span {
    word-break: break-all !important;
    overflow-wrap: break-word !important;
  }
`;
if (typeof document !== "undefined") {
  document.head.appendChild(contentStyle);
}

interface EventBlockModalProps {
    block: string;
    title: string;
    onClose: () => void;
}

function detectLanguage(str: string): string {
    const trimmed = str.trim();
    
    // Check for XML/HTML tags
    if (trimmed.includes("<") && trimmed.includes(">")) {
        return "xml";
    }
    
    // Check for JSON
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            JSON.parse(trimmed);
            return "json";
        } catch {
            return "plaintext";
        }
    }
    return "plaintext";
}

export function EventBlockModal({ block, title, onClose }: EventBlockModalProps) {
    const [copied, setCopied] = useState(false);
    const backdropRef = useRef<HTMLDivElement>(null);

    const formatted = formatEventBlock(block);
    const language = detectLanguage(formatted);
    const highlighted = hljs.highlight(formatted, { language });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const handleCopy = () => {
        navigator.clipboard.writeText(formatted).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleBackdrop = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) onClose();
    };

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="border-b border-gray-700 bg-gray-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <span className="text-base font-semibold text-gray-100">{title}</span>
                            <span className="rounded px-2 py-1 text-xs text-gray-400 font-mono bg-gray-700/50">BLOCO</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-gray-100"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        Copiado!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        Copiar
                                    </>
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center text-gray-400 transition-all hover:bg-gray-700 hover:text-gray-100 rounded"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div 
                    className="event-block-content flex-1 overflow-y-auto bg-gray-950 w-full"
                    style={{ 
                        overflowX: "hidden", 
                        maxWidth: "100%",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <pre 
                        className="font-mono text-xs p-4 m-0 leading-relaxed text-gray-300"
                        style={{ 
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            overflowWrap: "break-word",
                            maxWidth: "100%",
                            flex: 1,
                            boxSizing: "border-box",
                            minWidth: 0,
                            overflow: "visible"
                        }}
                    >
                        <code
                            className={`hljs language-${language}`}
                            dangerouslySetInnerHTML={{ __html: highlighted.value }}
                            style={{
                                wordBreak: "break-all",
                                overflowWrap: "break-word",
                                maxWidth: "100%"
                            }}
                        />
                    </pre>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800 px-4 py-2 text-xs text-gray-500">
                    <span>{formatted.split("\n").length} linhas</span>
                    <span>Ctrl+F para pesquisar • ESC para fechar</span>
                </div>
            </div>
        </div>
    );
}
