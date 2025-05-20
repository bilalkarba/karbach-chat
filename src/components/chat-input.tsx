
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, Loader2, Mic, MicOff, StopCircle } from "lucide-react";
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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || isRecording) return;
    await onSendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const requestMicrophonePermission = async () => {
    if (microphoneState === 'requesting' || microphoneState === 'denied' || microphoneState === 'unsupported') return false;

    if (typeof window !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setMicrophoneState('requesting');
      try {
        // Request permission without immediately starting recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop the tracks if we're only asking for permission and not recording yet
        stream.getTracks().forEach(track => track.stop());
        setMicrophoneState('granted');
        toast({
          title: "تم منح الوصول إلى الميكروفون",
          description: "يمكنك الآن استخدام الميكروفون للتسجيل.",
        });
        return true;
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setMicrophoneState('denied');
        toast({
          variant: 'destructive',
          title: "تم رفض الوصول إلى الميكروفون",
          description: "يرجى تمكين أذونات الميكروفون في إعدادات المتصفح لاستخدام هذه الميزة.",
        });
        return false;
      }
    } else {
      setMicrophoneState('unsupported');
      toast({
        variant: 'destructive',
        title: "الميكروفون غير مدعوم",
        description: "متصفحك لا يدعم الوصول إلى الميكروفون أو أنك لست على اتصال آمن (HTTPS).",
      });
      return false;
    }
  };

  const startRecording = async () => {
    if (microphoneState !== 'granted') {
      toast({
        variant: 'destructive',
        title: "إذن الميكروفون مطلوب",
        description: "يرجى منح إذن الوصول إلى الميكروفون أولاً.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // For now, we'll just indicate that audio was recorded.
        // Next step would be to convert this blob to a Data URI and send to an API for transcription.
        setInputValue("تم تسجيل الصوت. ميزة تحويل النص قيد التطوير.");
        toast({
          title: "تم إيقاف التسجيل",
          description: "تم تسجيل الصوت بنجاح. ميزة تحويل الصوت إلى نص قيد التطوير حاليًا.",
        });
        // Release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({
        title: "بدء التسجيل...",
      });
    } catch (error) {
        console.error("Error starting recording:", error);
        toast({
          variant: 'destructive',
          title: "خطأ في بدء التسجيل",
          description: "لم نتمكن من بدء التسجيل. يرجى المحاولة مرة أخرى.",
        });
        setIsRecording(false); // Ensure recording state is reset
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Toast for stopping is handled in onstop
    }
  };

  const onMicButtonClick = async () => {
    if (isLoading) return;

    if (microphoneState === 'granted') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else if (microphoneState === 'idle' || microphoneState === 'denied') { // Allow re-request if denied
      const permissionGranted = await requestMicrophonePermission();
      if (permissionGranted) {
        // User will need to click again to start recording
         toast({
          title: "الإذن ممنوح",
          description: "انقر على زر الميكروفون مرة أخرى لبدء التسجيل.",
        });
      }
    } else if (microphoneState === 'unsupported') {
       toast({
        variant: 'destructive',
        title: "الميكروفون غير مدعوم",
        description: "متصفحك لا يدعم الوصول إلى الميكروفون أو أنك لست على اتصال آمن (HTTPS).",
      });
    }
    // If 'requesting', do nothing, let the process complete.
  };


  let micButtonIcon: React.ReactNode;
  let micButtonTooltip: string;
  let isMicButtonDisabled = isLoading; // General disable if app is loading response

  if (isRecording) {
    micButtonIcon = <StopCircle className="h-5 w-5 text-destructive" />;
    micButtonTooltip = "إيقاف التسجيل";
  } else {
    switch (microphoneState) {
      case 'requesting':
        micButtonIcon = <Loader2 className="h-5 w-5 animate-spin" />;
        micButtonTooltip = "جاري طلب الوصول إلى الميكروفون...";
        isMicButtonDisabled = true; // Disable while requesting
        break;
      case 'granted':
        micButtonIcon = <Mic className="h-5 w-5 text-primary" />;
        micButtonTooltip = "بدء التسجيل الصوتي";
        break;
      case 'denied':
        micButtonIcon = <MicOff className="h-5 w-5 text-destructive" />;
        micButtonTooltip = "تم رفض الوصول إلى الميكروفون. انقر لإعادة المحاولة.";
        break;
      case 'unsupported':
        micButtonIcon = <MicOff className="h-5 w-5 text-destructive" />;
        micButtonTooltip = "الميكروفون غير مدعوم أو اتصال غير آمن.";
        isMicButtonDisabled = true; // Disable if unsupported
        break;
      case 'idle':
      default:
        micButtonIcon = <Mic className="h-5 w-5" />;
        micButtonTooltip = "تمكين الإدخال الصوتي (يتطلب إذن الميكروفون)";
        break;
    }
  }
  if (isLoading) isMicButtonDisabled = true; // Overall disable if app is busy

  return (
    <TooltipProvider>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 p-4 border-t bg-background sticky bottom-0"
      >
        <Input
          type="text"
          placeholder={isRecording ? "جاري التسجيل..." : "اكتب رسالتك هنا..."}
          value={inputValue}
          onChange={handleInputChange}
          disabled={isLoading || isRecording}
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
          disabled={isLoading || !inputValue.trim() || isRecording}
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

    