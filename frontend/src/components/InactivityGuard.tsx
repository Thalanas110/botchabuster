/**
 * InactivityGuard
 *
 * Signs the user out automatically after 15 minutes of no interaction.
 * Must be mounted inside both <BrowserRouter> and <AuthProvider>.
 *
 * Activity events that reset the timer:
 *   mousemove, mousedown, keydown, touchstart, scroll, click
 *
 * Offline behaviour:
 *   The sign-out is purely local (clears in-memory state; localStorage is
 *   preserved when offline so the user can re-authenticate via cached
 *   credentials). The backend sign-out call is attempted but never blocks.
 */

import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
] as const;

function useInactivitySignOut() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(async () => {
      await signOut();
      navigate("/login");
      toast.info("You were signed out due to inactivity.", { duration: 6000 });
    }, TIMEOUT_MS);
  }, [clearTimer, signOut, navigate]);

  useEffect(() => {
    if (!user) {
      clearTimer();
      return;
    }

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true }),
    );

    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer),
      );
    };
  }, [user, resetTimer, clearTimer]);
}

export function InactivityGuard() {
  useInactivitySignOut();
  return null;
}
