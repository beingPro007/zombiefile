"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";

function CopyButton({ text, className = "" }) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={copyToClipboard}
      className={`relative bg-black text-white hover:bg-gray-800 rounded-md px-3 py-2 ${className}`}
      aria-label={isCopied ? "Copied" : "Copy to clipboard"}
    >
      <span
        className={`transition-opacity duration-300 ${
          isCopied ? "opacity-0" : "opacity-100"
        }`}
      >
        <Copy className="h-4 w-4" />
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          isCopied ? "opacity-100" : "opacity-0"
        }`}
      >
        <Check className="h-4 w-4 text-green-500" />
      </span>
      <span className="sr-only">{isCopied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default CopyButton;
