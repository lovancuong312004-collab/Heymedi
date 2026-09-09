/**
 * useWakeWord – Custom hook lắng nghe từ khóa "heymedi" liên tục
 * Đã được nâng cấp thuật toán lọc nhiễu chữ tiếng Việt
 */

import { useEffect, useRef, useCallback, useState } from "react";

export type WakeWordState = "idle" | "listening" | "detected" | "error" | "unsupported" | "paused";

// Nâng cấp: Thêm các cách người già/người Việt hay phát âm sai
const WAKE_KEYWORDS = [
  "hey medi", "heymedi", "hay medi", "hê mê đi", "hey mini", 
  "chào medi", "heymedy", "hey mê đi", "gọi medi"
];

// Nâng cấp: Thuật toán dọn dẹp chuỗi (chuẩn hóa tiếng Việt, bỏ dấu chấm phẩy)
function isWakeWord(transcript: string): boolean {
  const t = transcript.toLowerCase()
    .replace(/[.,!?]/g, "") // Xóa dấu câu để so sánh chuẩn hơn
    .trim();
  return WAKE_KEYWORDS.some((kw) => t.includes(kw));
}

interface UseWakeWordOptions {
  enabled: boolean;
  onDetected: () => void;
  pauseWhen?: boolean;
  lang?: string;
}

export function useWakeWord({
  enabled,
  onDetected,
  pauseWhen = false,
  lang = "vi-VN",
}: UseWakeWordOptions) {
  const [state, setState] = useState<WakeWordState>("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const pauseRef = useRef(pauseWhen);
  const restartTimerRef = useRef<any>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { pauseRef.current = pauseWhen; }, [pauseWhen]);

  const SpeechRecognitionClass = typeof window !== "undefined" 
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) 
    : undefined;

  const startRecognition = useCallback(() => {
    if (!isMountedRef.current || !enabledRef.current || isStartingRef.current) return;
    if (pauseRef.current) { setState("paused"); return; }
    if (!SpeechRecognitionClass) { setState("unsupported"); return; }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    isStartingRef.current = true;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.continuous = false; // Ngắt quãng ngắn để tránh tràn bộ nhớ trình duyệt
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isStartingRef.current = false;
      if (isMountedRef.current) setState("listening");
    };

    recognition.onresult = (event: any) => {
      let fullTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      
      if (fullTranscript) setLastTranscript(fullTranscript);

      if (isWakeWord(fullTranscript)) {
        setState("detected");
        try { recognition.abort(); } catch (_) {} // Dừng mic tạm thời
        
        if (isMountedRef.current) {
          onDetected(); // Kích hoạt UI hiển thị lên
          
          // Sau khi AI hiện lên xử lý xong, 3s sau tự động nghe lén lại
          restartTimerRef.current = setTimeout(() => {
            if (enabledRef.current && !pauseRef.current && isMountedRef.current) {
              startRecognition();
            }
          }, 3000);
        }
      }
    };

    recognition.onerror = (event: any) => {
      isStartingRef.current = false;
      if (!isMountedRef.current) return;
      if (event.error === "not-allowed") { setState("error"); return; }
      
      // Khởi động lại mic nếu không có ai nói gì (no-speech)
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !pauseRef.current && isMountedRef.current) startRecognition();
      }, 500);
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      if (!isMountedRef.current) return;
      
      // Loop vô tận: Mic tắt -> tự động bật lại ngay lập tức
      if (enabledRef.current && !pauseRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !pauseRef.current && isMountedRef.current) startRecognition();
        }, 100);
      } else {
        setState(pauseRef.current ? "paused" : "idle");
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } 
    catch (err) {
      isStartingRef.current = false;
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !pauseRef.current && isMountedRef.current) startRecognition();
      }, 1000);
    }
  }, [lang, onDetected]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled && !pauseWhen) startRecognition();
    else {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
      setState(pauseWhen ? "paused" : "idle");
    }
    return () => {
      isMountedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, [enabled, pauseWhen]);

  return { state, isListening: state === "listening", lastTranscript };
}
