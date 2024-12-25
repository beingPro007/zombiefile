import React from "react";
import { Github, Coffee } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-center space-x-4">
      <Button variant="ghost" size="icon" asChild>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <Github className="h-5 w-5" />
        </a>
      </Button>
      <Button variant="ghost" size="icon" asChild>
        <a
          href="https://www.buymeacoffee.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy Me a Coffee"
        >
          <Coffee className="h-5 w-5" />
        </a>
      </Button>
    </footer>
  );
}
