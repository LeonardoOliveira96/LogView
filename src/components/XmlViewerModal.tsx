import { useEffect, useRef, useState } from "react";
import { X, Copy, Check, Code2 } from "lucide-react";
import { formatXml } from "@/lib/logParser";

interface XmlViewerModalProps {
    xml: string;
    title: string;
    onClose: () => void;
}

function colorizeXml(xml: string): string {
    return xml
        // Escape HTML first
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Colorize XML declaration
        .replace(
            /(&lt;\?xml[^?]*\?&gt;)/g,
            '<span class="text-muted-foreground">$1</span>'
        )
        // Colorize closing tags
        .replace(
            /(&lt;\/)([\w:.-]+)(&gt;)/g,
            '<span class="text-blue-400">$1</span><span class="text-blue-300">$2</span><span class="text-blue-400">$3</span>'
        )
        // Colorize opening/self-closing tags with attributes
        .replace(
            /(&lt;)([\w:.-]+)((?:\s+[\w:.-]+=&quot;[^&]*&quot;)*)(\s*\/?)(&gt;)/g,
            (_, open, tag, attrs, selfClose, close) => {
                const coloredAttrs = attrs.replace(
                    /([\w:.-]+)(=)(&quot;)([^&]*)(&quot;)/g,
                    '<span class="text-yellow-400">$1</span><span class="text-gray-400">$2</span><span class="text-green-400">$3$4$5</span>'
                );
                return (
                    `<span class="text-blue-400">${open}</span>` +
                    `<span class="text-blue-300">${tag}</span>` +
                    coloredAttrs +
                    `<span class="text-blue-400">${selfClose}${close}</span>`
                );
            }
        )
        // Colorize text nodes (values between tags)
        .replace(
            /(&gt;)([^&<\n]+)(&lt;)/g,
            '$1<span class="text-amber-200">$2</span>$3'
        );
}

export function XmlViewerModal({ xml, title, onClose }: XmlViewerModalProps) {
    const [copied, setCopied] = useState(false);
    const backdropRef = useRef<HTMLDivElement>(null);

    const formatted = formatXml(xml);
    const colorized = colorizeXml(formatted);
    const lines = colorized.split("\n");

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
            <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-[#0d1117] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 bg-[#161b22] px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-semibold text-foreground">{title}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground font-mono">XML</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3 w-3 text-success" />
                                    Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3 w-3" />
                                    Copiar XML
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Code area */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full font-mono text-sm">
                        <tbody>
                            {lines.map((line, i) => (
                                <tr key={i} className="group hover:bg-white/[0.03]">
                                    <td className="w-12 select-none border-r border-border/20 pr-3 pl-2 text-right text-xs text-muted-foreground/40 align-top leading-6">
                                        {i + 1}
                                    </td>
                                    <td
                                        className="pl-4 pr-4 leading-6 text-gray-200 whitespace-pre"
                                        dangerouslySetInnerHTML={{ __html: line || " " }}
                                    />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/50 bg-[#161b22] px-4 py-2 text-xs text-muted-foreground">
                    <span>{lines.length} linhas</span>
                    <span>ESC para fechar</span>
                </div>
            </div>
        </div>
    );
}
