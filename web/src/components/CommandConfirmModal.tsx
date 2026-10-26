import React from 'react';
import { Terminal, ShieldAlert } from 'lucide-react';
import { Modal, Button, Badge } from './ui';

interface CommandConfirmModalProps {
  isOpen: boolean;
  command: string;
  onConfirm: () => void;
  onDeny: () => void;
}

export const CommandConfirmModal: React.FC<CommandConfirmModalProps> = ({
  isOpen,
  command,
  onConfirm,
  onDeny,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onDeny} size="sm">
      <Modal.Header
        icon={
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <ShieldAlert size={20} />
          </div>
        }
        title="Подтверждение команды"
        subtitle="Плагин запрашивает запуск процесса на хосте"
        badge={<Badge variant="warning" size="sm">HOST EXEC</Badge>}
        onClose={onDeny}
      />

      <Modal.Body className="p-5 space-y-4">
        <p className="text-xs text-gray-400 leading-relaxed">
          Команда классифицирована системой безопасности как требующая вашего прямого согласия:
        </p>

        <div className="bg-black/40 border border-base-border rounded-xl p-3 flex items-start space-x-2 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
          <Terminal size={14} className="mt-0.5 shrink-0 text-gray-500" />
          <span className="break-all">{command}</span>
        </div>

        <p className="text-[11px] text-gray-500">
          Система безопасности Config Studio требует явного согласия администратора перед выполнением команд, способных повлиять на состояние хоста.
        </p>
      </Modal.Body>

      <Modal.Footer justify="end">
        <Button variant="secondary" size="sm" onClick={onDeny}>
          Отклонить
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
        >
          Разрешить
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
