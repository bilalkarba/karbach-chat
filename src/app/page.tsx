"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage, type Message } from "@/components/chat-message";
import { callGeminiApi } from "@/ai/flows/call-gemini-api";
import { useToast } from "@/hooks/use-toast";
import { Bot } from "lucide-react";

export default function DardashaAIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await callGeminiApi({ message: text });
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: aiResponse.response,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
       const errorMessage: Message = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Effect to add an initial greeting message from the AI
  useEffect(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        sender: "ai",
        text: "Hello! I'm Dardasha AI. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }, []);


  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 border-b shadow-sm">
        <div className="container mx-auto flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Dardasha AI</h1>
        </div>
      </header>
      
      <main className="flex-grow overflow-hidden flex flex-col container mx-auto max-w-3xl w-full p-0 md:p-4">
        <Card className="flex-grow flex flex-col shadow-xl rounded-none md:rounded-lg overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-lg text-center text-primary">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow p-0 overflow-hidden">
            <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </ScrollArea>
          </CardContent>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </Card>
      </main>
    </div>
  );
}
