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
        "flex items-start gap-4 animate-fadeInSlideUp",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-9 w-9 border">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={20} />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-lg p-3 px-4 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground border rounded-bl-none"
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
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
        )}
        <p className={cn(
            "text-xs mt-2 pt-1 border-t",
            isUser ? "border-primary-foreground/20 text-primary-foreground/70 text-right" : "border-border/50 text-muted-foreground text-left"
          )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
         <Avatar className="h-9 w-9 border">
           <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User size={20} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
