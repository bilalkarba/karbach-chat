
"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, Loader2, Mic, MicOff } from "lucide-react"; // Changed Microphone to Mic
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  const [microphoneState, setMicrophoneState] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    await onSendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleMicPermissionRequest = async () => {
    if (microphoneState === 'requesting' || microphoneState === 'denied' || microphoneState === 'unsupported') return;

    if (typeof window !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setMicrophoneState('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicrophoneState('granted');
        toast({
          title: "تم منح الوصول إلى الميكروفون",
          description: "ميزة الإدخال الصوتي قيد التطوير وسيتم تفعيلها قريباً.",
        });
        // Stop tracks to release the microphone immediately as we are not recording yet
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setMicrophoneState('denied');
        toast({
          variant: 'destructive',
          title: "تم رفض الوصول إلى الميكروفون",
          description: "يرجى تمكين أذونات الميكروفون في إعدادات المتصفح لاستخدام هذه الميزة.",
        });
      }
    } else {
      setMicrophoneState('unsupported');
      toast({
        variant: 'destructive',
        title: "الميكروفون غير مدعوم",
        description: "متصفحك لا يدعم الوصول إلى الميكروفون أو أنك لست على اتصال آمن (HTTPS).",
      });
    }
  };

  let micButtonIcon: React.ReactNode;
  let micButtonTooltip: string;
  let isMicButtonDisabled = isLoading;

  switch (microphoneState) {
    case 'requesting':
      micButtonIcon = <Loader2 className="h-5 w-5 animate-spin" />;
      micButtonTooltip = "جاري طلب الوصول إلى الميكروفون...";
      isMicButtonDisabled = true;
      break;
    case 'granted':
      micButtonIcon = <Mic className="h-5 w-5 text-primary" />; // Changed Microphone to Mic
      micButtonTooltip = "تم تمكين الميكروفون. ميزة الإدخال الصوتي قيد التطوير.";
      // Allow clicking again to show "coming soon" toast, disable if main input is loading
      isMicButtonDisabled = isLoading;
      break;
    case 'denied':
      micButtonIcon = <MicOff className="h-5 w-5 text-destructive" />;
      micButtonTooltip = "تم رفض الوصول إلى الميكروفون. يرجى التمكين من إعدادات المتصفح.";
      isMicButtonDisabled = true;
      break;
    case 'unsupported':
      micButtonIcon = <MicOff className="h-5 w-5 text-destructive" />;
      micButtonTooltip = "الميكروفون غير مدعوم أو اتصال غير آمن.";
      isMicButtonDisabled = true;
      break;
    case 'idle':
    default:
      micButtonIcon = <Mic className="h-5 w-5" />; // Changed Microphone to Mic
      micButtonTooltip = "تمكين الإدخال الصوتي (يتطلب إذن الميكروفون)";
      isMicButtonDisabled = isLoading;
      break;
  }

  const onMicButtonClick = () => {
    if (microphoneState === 'granted') {
      toast({
        title: "ميزة الإدخال الصوتي قيد التطوير",
        description: "سيتم تفعيل هذه الميزة في التحديثات القادمة.",
      });
    } else {
      handleMicPermissionRequest();
    }
  };

  return (
    <TooltipProvider>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 p-4 border-t bg-background sticky bottom-0"
      >
        <Input
          type="text"
          placeholder="اكتب رسالتك هنا..."
          value={inputValue}
          onChange={handleInputChange}
          disabled={isLoading}
          className="flex-grow rounded-full px-4 py-2 focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Chat message input"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onMicButtonClick}
              disabled={isMicButtonDisabled}
              className="rounded-full"
              aria-label={micButtonTooltip}
            >
              {micButtonIcon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{micButtonTooltip}</p>
          </TooltipContent>
        </Tooltip>
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
    </TooltipProvider>
  );
}
