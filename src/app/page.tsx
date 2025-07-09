"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage, type Message } from "@/components/chat-message";
import { callGeminiApi } from "@/ai/flows/call-gemini-api";
import { useToast } from "@/hooks/use-toast";
import { Bot, Github } from "lucide-react";

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

  const handleSendMessage = async (text: string, file?: { dataUri: string; type: string; name: string }) => {
    if (!text.trim() && !file) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text,
      timestamp: new Date(),
      file,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await callGeminiApi({ 
        message: text,
        fileDataUri: file?.dataUri,
       });
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
    <div className="flex flex-col min-h-screen bg-background">
      <header className="p-4 border-b shadow-sm bg-card">
        <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Dardasha AI</h1>
            </div>
            <a href="https://github.com/Firebase-Studio-Apps/Dardasha-AI-pws7" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository">
                <Github className="h-6 w-6 text-foreground hover:text-primary transition-colors"/>
            </a>
        </div>
      </header>
      
      <main className="flex-grow overflow-hidden flex flex-col container mx-auto max-w-4xl w-full p-4">
        <Card className="flex-grow flex flex-col shadow-lg rounded-xl overflow-hidden border">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg text-center font-semibold text-primary">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow p-0 overflow-hidden">
            <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
              <div className="space-y-6">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </Card>
      </main>
       <footer className="py-6 mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Dardasha AI. Built with Firebase Studio.</p>
        </div>
      </footer>
    </div>
  );
}