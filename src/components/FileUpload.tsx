import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";

interface FileUploadProps {
  onFileLoaded: (content: string, fileName: string) => void;
  compact?: boolean;
  onReset?: () => void;
}

export function FileUpload({ onFileLoaded, compact, onReset }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoaded(text, file.name);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const triggerPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gat,.log,.txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (compact) {
    const handleCompactClick = () => {
      if (onReset) {
        onReset();
      } else {
        triggerPicker();
      }
    };

    return (
      <button
        onClick={handleCompactClick}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Carregar outro arquivo"
      >
        <Upload className="h-3.5 w-3.5" />
        Novo arquivo
      </button>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`
        relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 
        transition-all duration-300 cursor-pointer
        ${isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
        }
      `}
      onClick={triggerPicker}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        {fileName ? (
          <FileText className="h-8 w-8 text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-primary" />
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">
          {fileName || "Arraste o arquivo .gat aqui"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {fileName
            ? "Clique para carregar outro arquivo"
            : "ou clique para selecionar"}
        </p>
      </div>
    </div>
  );
}
