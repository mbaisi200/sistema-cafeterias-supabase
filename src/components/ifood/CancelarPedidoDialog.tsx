'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, XCircle } from 'lucide-react';

interface CancelarPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => void;
  loading?: boolean;
  pedidoId?: string;
}

const MOTIVOS_PREDEFINIDOS = [
  'Produto em falta',
  'Estabelecimento fechado',
  'Cliente solicitou cancelamento',
  'Erro no pedido',
  'Não foi possível entrar em contato com o cliente',
  'Endereço de entrega incorreto',
  'Outro motivo',
];

export function CancelarPedidoDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  pedidoId,
}: CancelarPedidoDialogProps) {
  const [motivo, setMotivo] = useState('');
  const [motivoSelecionado, setMotivoSelecionado] = useState('');

  const handleMotivoClick = (motivoPredefinido: string) => {
    if (motivoSelecionado === motivoPredefinido) {
      setMotivoSelecionado('');
      setMotivo('');
    } else {
      setMotivoSelecionado(motivoPredefinido);
      setMotivo(motivoPredefinido);
    }
  };

  const handleConfirm = () => {
    if (motivo.trim()) {
      onConfirm(motivo);
    }
  };

  const handleClose = () => {
    setMotivo('');
    setMotivoSelecionado('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            {pedidoId && `Pedido #${pedidoId} - `}
            Informe o motivo do cancelamento. Esta ação notificará o cliente e o iFood.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Motivos predefinidos */}
          <div>
            <Label className="text-sm font-medium">Motivos frequentes:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MOTIVOS_PREDEFINIDOS.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={motivoSelecionado === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleMotivoClick(m)}
                  className="text-xs"
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {/* Campo de motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo do cancelamento *</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (motivoSelecionado && !MOTIVOS_PREDEFINIDOS.includes(e.target.value)) {
                  setMotivoSelecionado('');
                }
              }}
              placeholder="Descreva o motivo do cancelamento..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <strong>Atenção:</strong> O cancelamento será enviado ao iFood e o cliente será notificado automaticamente.
              Esta ação não pode ser desfeita.
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!motivo.trim() || loading}
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
