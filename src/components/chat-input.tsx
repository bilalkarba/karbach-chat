"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    await onSendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 p-4 border-t bg-background sticky bottom-0"
    >
      <Input
        type="text"
        placeholder="Type your message..."
        value={inputValue}
        onChange={handleInputChange}
        disabled={isLoading}
        className="flex-grow rounded-full px-4 py-2 focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Chat message input"
      />
      <Button
        type="submit"
        size="icon"
        disabled={isLoading || !inputValue.trim()}
        className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label="Send message"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <SendHorizontal className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
}
