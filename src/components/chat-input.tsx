
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, Loader2, Mic, MicOff, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { transcribeAudio } from "@/ai/flows/transcribe-audio-flow";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean; // This is for AI response loading
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  const [microphoneState, setMicrophoneState] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || isRecording || isTranscribing) return;
    await onSendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const requestMicrophonePermission = async () => {
    if (microphoneState === 'requesting' || microphoneState === 'denied' || microphoneState === 'unsupported') {
      if (microphoneState === 'denied') {
         toast({
          variant: 'destructive',
          title: "تم رفض الوصول إلى الميكروفون سابقًا",
          description: "يرجى تمكين أذونات الميكروفون في إعدادات المتصفح.",
        });
      }
      return false;
    }

    if (typeof window !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setMicrophoneState('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop tracks immediately, only for permission
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
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) return;
      // If permission was just granted, user needs to click again. Better UX would be to auto-start.
      // For now, let's stick to requiring another click if permission was just granted.
      toast({ title: "الإذن ممنوح", description: "انقر على زر الميكروفون مرة أخرى لبدء التسجيل."});
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Try common MIME types, browser will pick one
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/aac', 'audio/wav', 'audio/webm'];
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

      if (!supportedMimeType) {
        toast({ variant: 'destructive', title: "تنسيق الصوت غير مدعوم", description: "لم يتم العثور على تنسيق صوت مدعوم للتسجيل."});
        return;
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: supportedMimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });
         // Release the microphone
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size === 0) {
          toast({ variant: 'destructive', title: "تسجيل فارغ", description: "لم يتم تسجيل أي صوت."});
          setIsRecording(false);
          return;
        }
        
        setIsTranscribing(true);
        toast({ title: "جاري تحويل الصوت إلى نص..." });

        const reader = new FileReader();
        reader.onloadend = async () => {
          const audioDataUri = reader.result as string;
          try {
            const result = await transcribeAudio({ audioDataUri });
            if (result.transcribedText && result.transcribedText.trim() !== "") {
              await onSendMessage(result.transcribedText.trim());
              toast({ title: "تم إرسال الرسالة من الصوت" });
            } else {
              toast({ variant: 'default', title: "لم يتمكن من فهم الصوت", description: "لم يتم العثور على نص في التسجيل أو كان الصوت غير واضح." });
            }
          } catch (transcriptionError) {
            console.error("Transcription error:", transcriptionError);
            toast({ variant: 'destructive', title: "خطأ في تحويل الصوت", description: "حدث خطأ أثناء محاولة تحويل الصوت إلى نص. حاول مرة أخرى." });
          } finally {
            setIsTranscribing(false);
            setInputValue(""); // Clear input field after attempting to send
          }
        };
        reader.onerror = () => {
            console.error("FileReader error");
            toast({ variant: 'destructive', title: "خطأ في قراءة الصوت", description: "حدث خطأ أثناء معالجة الملف الصوتي." });
            setIsTranscribing(false);
            setIsRecording(false);
        }
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({ title: "بدء التسجيل...", description: "انقر على زر الإيقاف لإنهاء التسجيل والإرسال." });
    } catch (error) {
        console.error("Error starting recording:", error);
        toast({
          variant: 'destructive',
          title: "خطأ في بدء التسجيل",
          description: "لم نتمكن من بدء التسجيل. تأكد من أن الميكروفون متصل ويعمل.",
        });
        setIsRecording(false); 
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // onstop handler will do the rest
      setIsRecording(false);
      // Toast for stopping and processing is handled in onstop and subsequent async operations
    }
  };

  const onMicButtonClick = async () => {
    if (isLoading || isTranscribing) return;

    if (isRecording) {
      stopRecording();
    } else {
        if (microphoneState === 'granted') {
            startRecording();
        } else {
             // Request permission if not already granted or if denied previously (allow re-request)
            const permissionGranted = await requestMicrophonePermission();
            if (permissionGranted) {
                 toast({
                    title: "الإذن ممنوح",
                    description: "انقر على زر الميكروفون مرة أخرى لبدء التسجيل.",
                });
                // User will need to click again to start recording
            }
        }
    }
  };


  let micButtonIcon: React.ReactNode;
  let micButtonTooltip: string;
  let isMicButtonDisabled = isLoading || isTranscribing;

  if (isRecording) {
    micButtonIcon = <StopCircle className="h-5 w-5 text-destructive" />;
    micButtonTooltip = "إيقاف التسجيل والإرسال";
  } else if (isTranscribing) {
    micButtonIcon = <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    micButtonTooltip = "جاري تحويل الصوت...";
    isMicButtonDisabled = true;
  }
  else {
    switch (microphoneState) {
      case 'requesting':
        micButtonIcon = <Loader2 className="h-5 w-5 animate-spin" />;
        micButtonTooltip = "جاري طلب الوصول إلى الميكروفون...";
        isMicButtonDisabled = true;
        break;
      case 'granted':
        micButtonIcon = <Mic className="h-5 w-5 text-primary" />;
        micButtonTooltip = "بدء التسجيل الصوتي";
        break;
      case 'denied':
        micButtonIcon = <MicOff className="h-5 w-5 text-destructive" />;
        micButtonTooltip = "تم رفض الوصول إلى الميكروفون. انقر لمنح الإذن.";
        break;
      case 'unsupported':
        micButtonIcon = <MicOff className="h-5 w-5 text-destructive" />;
        micButtonTooltip = "الميكروفون غير مدعوم أو اتصال غير آمن.";
        isMicButtonDisabled = true;
        break;
      case 'idle':
      default:
        micButtonIcon = <Mic className="h-5 w-5" />;
        micButtonTooltip = "تمكين الإدخال الصوتي (يتطلب إذن الميكروفون)";
        break;
    }
  }
   if (isLoading) isMicButtonDisabled = true;


  return (
    <TooltipProvider>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 p-4 border-t bg-background sticky bottom-0"
      >
        <Input
          type="text"
          placeholder={isRecording ? "جاري التسجيل..." : (isTranscribing ? "جاري تحويل الصوت..." : "اكتب رسالتك هنا...")}
          value={inputValue}
          onChange={handleInputChange}
          disabled={isLoading || isRecording || isTranscribing}
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
          disabled={isLoading || !inputValue.trim() || isRecording || isTranscribing}
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          aria-label="Send message"
        >
          {isLoading ? ( // This isLoading is for AI chat response, not transcription
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizontal className="h-5 w-5" />
          )}
        </Button>
      </form>
    </TooltipProvider>
  );
}
