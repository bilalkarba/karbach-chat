"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, File as FileIcon } from "lucide-react";
import Image from "next/image";

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  file?: {
    dataUri: string;
    type: string;
    name: string;
  };
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "user";

  return (
    <div
      className={cn(
        "flex items-end gap-2 mb-4 animate-fadeInSlideUp",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 self-start">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg p-3 shadow-md",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        {message.file && (
          <div className="mb-2">
            {message.file.type.startsWith("image/") ? (
                <Image
                  src={message.file.dataUri}
                  alt={message.file.name}
                  width={300}
                  height={300}
                  className="rounded-md max-w-full h-auto object-contain"
                />
            ) : (
              <div className={cn(
                  "p-2 rounded-md flex items-center gap-2",
                  isUser ? "bg-primary-foreground/10" : "bg-muted"
                )}>
                <FileIcon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-mono truncate">{message.file.name}</span>
              </div>
            )}
          </div>
        )}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        )}
        <p className={cn(
            "text-xs mt-1",
            isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left"
          )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
         <Avatar className="h-8 w-8 self-start">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
