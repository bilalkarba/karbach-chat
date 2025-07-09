
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, Loader2, Mic, MicOff, StopCircle, Paperclip, X, File as FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { transcribeAudio } from "@/ai/flows/transcribe-audio-flow";

interface ChatInputProps {
  onSendMessage: (message: string, file?: { dataUri: string; type: string; name: string }) => Promise<void>;
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
  const [selectedFile, setSelectedFile] = useState<{ dataUri: string; type: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedFile) || isLoading || isRecording || isTranscribing) return;
    await onSendMessage(inputValue.trim(), selectedFile ?? undefined);
    setInputValue("");
    setSelectedFile(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleAttachmentClick = () => {
    if (isLoading || isRecording || isTranscribing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // Limit file size to 4MB for Gemini Flash
          toast({
              variant: "destructive",
              title: "File is too large",
              description: "Please select a file smaller than 4MB.",
          });
          return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          dataUri: reader.result as string,
          type: file.type,
          name: file.name,
        });
      };
      reader.onerror = () => {
        toast({ variant: "destructive", title: "Error reading file" });
      };
      reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = '';
  };
  
  const removeSelectedFile = () => {
    setSelectedFile(null);
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
      toast({ title: "الإذن ممنوح", description: "انقر على زر الميكروفون مرة أخرى لبدء التسجيل."});
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
            setInputValue("");
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
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
            const permissionGranted = await requestMicrophonePermission();
            if (permissionGranted) {
                 toast({
                    title: "الإذن ممنوح",
                    description: "انقر على زر الميكروفون مرة أخرى لبدء التسجيل.",
                });
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
      <div className="flex flex-col gap-2 p-4 border-t bg-background sticky bottom-0">
        {selectedFile && (
          <div className="p-2 bg-muted rounded-md flex items-center gap-2 text-sm">
            {selectedFile.type.startsWith('image/') ? (
              <img src={selectedFile.dataUri} alt="Preview" className="h-10 w-10 rounded-md object-cover" />
            ) : (
              <div className="h-10 w-10 bg-secondary rounded-md flex items-center justify-center">
                <FileIcon className="h-6 w-6 text-secondary-foreground" />
              </div>
            )}
            <span className="flex-grow truncate">{selectedFile.name}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full flex-shrink-0" onClick={removeSelectedFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 w-full"
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,text/*,.json,.csv" />
          <Input
            type="text"
            placeholder={isRecording ? "جاري التسجيل..." : (isTranscribing ? "جاري تحويل الصوت..." : "اكتب رسالتك أو أرفق ملفًا...")}
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
                onClick={handleAttachmentClick}
                disabled={isLoading || isRecording || isTranscribing}
                className="rounded-full"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach file (Max 4MB)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onMicButtonClick}
                disabled={isMicButtonDisabled || !!selectedFile}
                className="rounded-full"
                aria-label={micButtonTooltip}
              >
                {micButtonIcon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{!!selectedFile ? "Recording disabled while file is attached" : micButtonTooltip}</p>
            </TooltipContent>
          </Tooltip>
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || (!inputValue.trim() && !selectedFile) || isRecording || isTranscribing}
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
      </div>
    </TooltipProvider>
  );
}
