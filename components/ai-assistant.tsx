"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, X, Bot } from "lucide-react";

export function AIAssistant() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] shadow-xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              Coming soon
            </p>
            <p className="text-sm">
              The AI assistant is being tuned for inventory accuracy.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
