import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft, Save, Code } from 'lucide-react';
import { GuardIssue } from '../types';
import { Modal, Button, Badge } from './ui';

interface PreSaveGuardModalProps {
  isOpen: boolean;
  issue: GuardIssue | null;
  filePath: string;
  isSaving?: boolean;
  onClose: (targetLine?: number, targetCol?: number) => void;
  onForceSave: () => void;
}

export const PreSaveGuardModal: React.FC<PreSaveGuardModalProps> = ({
  isOpen,
  issue,
  filePath,
  isSaving = false,
  onClose,
  onForceSave,
}) => {
  if (!issue) return null;

  const fileName = filePath.split('/').pop() || filePath;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(issue.line, issue.column)}
      size="lg"
      className="border-red-500/40"
    >
      <Modal.Header
        icon={
          <div className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
        }
        title="Pre-Save Guard: Ошибка синтаксиса"
        subtitle="Защита критической инфраструктуры предотвратила запись битого конфига"
        badge={<Badge variant="error" size="sm">422 BLOCKED</Badge>}
        onClose={() => onClose(issue.line, issue.column)}
      />

      <Modal.Body className="p-5 sm:p-6 space-y-4">
        {/* File & Warning info */}
        <div className="bg-black/25 border border-base-border rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Критический файл:</span>
            <Badge variant="accent" size="sm" className="font-mono">
              {fileName}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Локация ошибки:</span>
            <Badge variant="warning" size="sm" className="font-mono">
              Строка {issue.line}, Колонка {issue.column}
            </Badge>
          </div>
          <div className="pt-2 border-t border-base-border text-xs text-gray-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Этот файл помечен как чувствительный компонент системы. Сохранение с синтаксической ошибкой может
              привести к аварийному падению контейнеров или службы.
            </span>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-red-400" /> Сообщение валидатора
          </label>
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-3 text-xs font-mono text-red-200">
            {issue.message}
          </div>
        </div>

        {/* Snippet preview */}
        {issue.snippet && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Контекст в коде
            </label>
            <pre className="bg-black/40 border border-base-border rounded-xl p-3 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
              {issue.snippet.split('\n').map((line, idx) => {
                const isTarget = line.startsWith('>');
                return (
                  <div
                    key={idx}
                    className={
                      isTarget
                        ? 'bg-red-500/20 text-red-200 font-bold px-1.5 py-0.5 rounded -mx-1 border-l-2 border-red-500'
                        : 'text-gray-400'
                    }
                  >
                    {line}
                  </div>
                );
              })}
            </pre>
          </div>
        )}

        <div className="text-[11px] text-gray-400 bg-black/20 p-3 rounded-xl border border-base-border flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <span>
            При нажатии <strong>«Force Save»</strong> файл будет сохранен на диск, а инцидент будет зафиксирован
            в журнале аудита безопасности.
          </span>
        </div>
      </Modal.Body>

      <Modal.Footer justify="between">
        <Button
          variant="danger"
          size="sm"
          onClick={onForceSave}
          disabled={isSaving}
          loading={isSaving}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          {isSaving ? 'Сохранение...' : 'Force Save (Все равно сохранить)'}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onClose(issue.line, issue.column)}
          disabled={isSaving}
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          Вернуться к редактированию
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
