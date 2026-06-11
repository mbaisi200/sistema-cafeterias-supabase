'use client';

import { useAppVersion } from '@/hooks/useAppVersion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export function VersionChecker() {
  const { hasUpdate, currentVersion, dismissUpdate } = useAppVersion();

  if (!hasUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center gap-3 px-4 py-3 border-b-2 border-red-500 bg-red-600 text-white shadow-lg">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Nova versão disponível</p>
        <p className="text-xs text-red-100">
          Versão {currentVersion} — recarregue para atualizar.
        </p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => { window.location.reload(); dismissUpdate(); }}
        className="shrink-0 bg-white text-red-700 hover:bg-red-50 font-semibold"
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Recarregar
      </Button>
    </div>
  );
}
