'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_INTERVAL = 60000; // 60s

interface VersionInfo {
  timestamp: number;
  version: string;
}

export function useAppVersion() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const initialRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`);
      const data: VersionInfo = await res.json();
      if (!currentVersion) {
        setCurrentVersion(data.version);
      }
      if (initialRef.current === 0) {
        initialRef.current = data.timestamp;
        return;
      }
      if (data.timestamp !== initialRef.current) {
        setHasUpdate(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } catch {
      // ignore
    }
  }, [currentVersion]);

  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
  }, []);

  useEffect(() => {
    checkVersion();
    timerRef.current = setInterval(checkVersion, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkVersion]);

  return { hasUpdate, currentVersion, dismissUpdate };
}
