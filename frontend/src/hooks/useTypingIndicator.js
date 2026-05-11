import { useRef, useCallback } from "react";
import { useChat } from "../context/ChatContext";

export function useTypingIndicator() {
  const { emitTyping } = useChat();
  const isTyping       = useRef(false);
  const stopTimer      = useRef(null);

  const onType = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      emitTyping(true);
    }
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      isTyping.current = false;
      emitTyping(false);
    }, 2000);
  }, [emitTyping]);

  const onStop = useCallback(() => {
    clearTimeout(stopTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      emitTyping(false);
    }
  }, [emitTyping]);

  return { onType, onStop };
}