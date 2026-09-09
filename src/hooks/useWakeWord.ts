/**
 * useWakeWord – Custom hook lắng nghe từ khóa "heymedi" liên tục
 * Dùng Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 * Chỉ hoạt động trên HTTPS hoặc localhost
 */

import { useEffect, useRef, useCallback, useState } from "react";

export type WakeWordState =
  | "idle"        // Hook chưa khởi động hoặc bị tắt
  | "listening"   // Đang lắng nghe
  | "detected"    // Phát hiện từ khóa
  | "error"       // Lỗi (thiếu permission, không hỗ trợ)
  | "unsupported" // Trình duyệt không hỗ trợ
  | "paused";     // Tạm dừng (vd: khi modal khác đang mở)

const WAKE_KEYWORDS = ["heymedi", "hey medi", "hey medy", "hey mede", "xin chào", "hey mini", "hey mede"];
// Fallback fuzzy: nếu transcript gần giống → trigger
function isWakeWord(transcript: string): boolean {
  const t = transcript.toLowerCase().trim();
  return WAKE_KEYWORDS.some((kw) => t.includes(kw));
}

interface UseWakeWordOptions {
  enabled: boolean;
  onDetected: () => void;
  /** Dừng recognition khi modalOpen=true để tránh xung đột */
  pauseWhen?: boolean;
  lang?: string;
}

export function useWakeWord({
  enabled,
  onDetected,
  pauseWhen = false,
  lang = "vi-VN",
}: UseWakeWordOptions): {
  state: WakeWordState;
  isListening: boolean;
  lastTranscript: string;
  restartManually: () => void;
} {
  const [state, setState] = useState<WakeWordState>("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const pauseRef = useRef(pauseWhen);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    pauseRef.current = pauseWhen;
  }, [pauseWhen]);

  const SpeechRecognitionClass =
    typeof window !== "undefined"
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : undefined;

  const startRecognition = useCallback(() => {
    if (!isMountedRef.current) return;
    if (!enabledRef.current) return;
    if (pauseRef.current) {
      setState("paused");
      return;
    }
    if (isStartingRef.current) return;
    if (!SpeechRecognitionClass) {
      setState("unsupported");
      return;
    }

    // Hủy recognition cũ nếu có
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    isStartingRef.current = true;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.continuous = false; // Restart sau mỗi kết quả để tránh timeout
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      isStartingRef.current = false;
      if (!isMountedRef.current) return;
      setState("listening");
    };

    recognition.onresult = (event: any) => {
      let fullTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          fullTranscript += event.results[i][j].transcript;
        }
      }
      if (fullTranscript) setLastTranscript(fullTranscript);

      if (isWakeWord(fullTranscript)) {
        setState("detected");
        try { recognition.abort(); } catch (_) {}
        if (isMountedRef.current) {
          onDetected();
          // Sau khi xử lý xong, tiếp tục lắng nghe sau 2s
          restartTimerRef.current = setTimeout(() => {
            if (enabledRef.current && !pauseRef.current && isMountedRef.current) {
              setState("listening");
              startRecognition();
            }
          }, 2000);
        }
      }
    };

    recognition.onerror = (event: any) => {
      isStartingRef.current = false;
      if (!isMountedRef.current) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setState("error");
        return;
      }
      if (event.error === "aborted") return; // chủ động abort → không restart

      // Các lỗi khác (network, no-speech) → tự restart sau 1s
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !pauseRef.current && isMountedRef.current) {
          startRecognition();
        }
      }, 1000);
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      if (!isMountedRef.current) return;
      if (enabledRef.current && !pauseRef.current) {
        // Tự động restart để tiếp tục lắng nghe liên tục
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !pauseRef.current && isMountedRef.current) {
            startRecognition();
          }
        }, 300);
      } else if (!enabledRef.current) {
        setState("idle");
      } else if (pauseRef.current) {
        setState("paused");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      isStartingRef.current = false;
      console.warn("[HeyMedi] SpeechRecognition start error:", err);
      // Retry sau 1s
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !pauseRef.current && isMountedRef.current) {
          startRecognition();
        }
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, onDetected]);

  // Khi enabled thay đổi → start hoặc stop
  useEffect(() => {
    isMountedRef.current = true;
    if (enabled && !pauseWhen) {
      startRecognition();
    } else {
      // Dừng
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
      setState(pauseWhen ? "paused" : "idle");
    }

    return () => {
      isMountedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pauseWhen]);

  const restartManually = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
    isStartingRef.current = false;
    startRecognition();
  }, [startRecognition]);

  return {
    state,
    isListening: state === "listening",
    lastTranscript,
    restartManually,
  };
}
