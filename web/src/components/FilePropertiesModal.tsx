import React, { useState, useEffect } from 'react';
import {
  FileText,
  Copy,
  Check,
  History,
  RotateCcw,
  Hash,
  Eye,
  EyeOff,
  GitCommit,
  Clock,
  Calendar,
} from 'lucide-react';
import { OpenFile, Settings, FileRevision } from '../types';
import { translations } from '../utils/i18n';
import { computeSHA256, formatBytes, copyToClipboard } from '../utils/color';
import { api } from '../services/api';
import { Modal, Button, Badge, ScrollArea } from './ui';

interface FilePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: OpenFile | null;
  settings: Settings;
  onRestoreRevision: (content: string) => void;
}

export const FilePropertiesModal: React.FC<FilePropertiesModalProps> = ({
  isOpen,
  onClose,
  file,
  settings,
  onRestoreRevision,
}) => {
  const [sha256, setSha256] = useState<string>('Computing...');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'props' | 'history'>('props');
  const [selectedRev, setSelectedRev] = useState<FileRevision | null>(null);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [fileDates, setFileDates] = useState<{ modifiedAt?: string; createdAt?: string }>({});

  const t = translations[settings.language] || translations.ru;

  useEffect(() => {
    if (file && isOpen) {
      // 1. Try compute on client via pure-JS SHA-256
      computeSHA256(file.content)
        .then((hash) => {
          if (hash) setSha256(hash);
        })
        .catch(() => {});

      // 2. Query authoritative server hash and file timestamps
      api.getFileInfo(file.path)
        .then((info) => {
          if (info.sha256) setSha256(info.sha256);
          setFileDates({
            modifiedAt: info.modifiedAt,
            createdAt: info.createdAt,
          });
        })
        .catch(() => {});
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const byteSize = new Blob([file.content]).size;
  const lineCount = file.content.split('\n').length;
  const wordCount = file.content.trim() ? file.content.trim().split(/\s+/).length : 0;

  const handleCopyHash = () => {
    copyToClipboard(sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = (rev: FileRevision) => {
    if (confirm(t.restoreConfirm.replace('{time}', rev.timestamp))) {
      onRestoreRevision(rev.content);
      onClose();
    }
  };

  // Compute a line-by-line diff preview between revision and current content
  const renderDiff = (revContent: string) => {
    const revLines = revContent.split('\n');
    const currLines = file.content.split('\n');
    const max = Math.max(revLines.length, currLines.length);
    const rows: { num: number; type: 'same' | 'added' | 'removed'; text: string }[] = [];

    for (let i = 0; i < max; i++) {
      const rLine = revLines[i];
      const cLine = currLines[i];
      if (rLine === cLine) {
        if (rLine !== undefined) {
          rows.push({
            num: i + 1,
            type: 'same',
            text: `  ${rLine}`,
          });
        }
      } else {
        if (rLine !== undefined) {
          rows.push({
            num: i + 1,
            type: 'removed',
            text: `- ${rLine}`,
          });
        }
        if (cLine !== undefined) {
          rows.push({
            num: i + 1,
            type: 'added',
            text: `+ ${cLine}`,
          });
        }
      }
    }

    return rows.slice(0, 150); // limit to 150 lines preview
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header with Tab switcher */}
      <div className="px-5 sm:px-6 py-3.5 border-b border-base-border flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('props')}
            className={`flex items-center space-x-2 text-sm font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'props'
                ? 'border-accent text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 text-accent" />
            <span>{t.fileProperties}</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 text-sm font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-accent text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <History className="w-4 h-4 text-accent" />
            <span>{t.editHistory}</span>
            {file.revisions.length > 0 && (
              <Badge variant="accent" size="sm">
                {file.revisions.length}
              </Badge>
            )}
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      <Modal.Body className="p-5 sm:p-6">
        {/* Tab 1: Properties */}
        {activeTab === 'props' && (
          <div className="space-y-4 text-xs">
            <div>
              <span className="block text-gray-400 uppercase font-semibold text-[10px] tracking-wider mb-1">
                {t.fileName}
              </span>
              <p className="font-mono text-sm font-semibold text-gray-100 truncate">
                {file.name}
              </p>
            </div>

            <div>
              <span className="block text-gray-400 uppercase font-semibold text-[10px] tracking-wider mb-1">
                {t.serverPath}
              </span>
              <p className="font-mono text-xs text-gray-300 break-all bg-black/25 p-2.5 rounded-xl border border-base-border">
                /{file.path}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-black/20 border border-base-border">
                <span className="text-[10px] text-gray-400 block">{t.fileSize}</span>
                <span className="text-sm font-semibold text-gray-100 mt-0.5 block">
                  {formatBytes(byteSize)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-base-border">
                <span className="text-[10px] text-gray-400 block">{t.lineCount}</span>
                <span className="text-sm font-semibold text-gray-100 mt-0.5 block">
                  {lineCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/20 border border-base-border">
                <span className="text-[10px] text-gray-400 block">{t.wordCount}</span>
                <span className="text-sm font-semibold text-gray-100 mt-0.5 block">
                  {wordCount}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-gray-400 uppercase font-semibold text-[10px] tracking-wider mb-1">
                {t.checksumSha256}
              </span>
              <div className="flex items-center space-x-2 bg-black/25 p-2 rounded-xl border border-base-border">
                <Hash className="w-4 h-4 text-accent shrink-0" />
                <code className="flex-1 font-mono text-[11px] text-gray-300 truncate select-all">
                  {sha256}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyHash}
                  icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  className={copied ? 'text-emerald-400' : ''}
                >
                  {copied ? t.copied : t.copy}
                </Button>
              </div>
            </div>

            {/* Timestamps */}
            {(fileDates.modifiedAt || fileDates.createdAt) && (
              <div className="pt-2 border-t border-base-border grid grid-cols-2 gap-3 text-gray-400 text-[11px]">
                {fileDates.modifiedAt && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>
                      {t.lastModified}:{' '}
                      <span className="text-gray-200 font-medium">
                        {new Date(fileDates.modifiedAt).toLocaleString(
                          settings.language === 'en' ? 'en-US' : 'ru-RU'
                        )}
                      </span>
                    </span>
                  </div>
                )}
                {fileDates.createdAt && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>
                      {t.created}:{' '}
                      <span className="text-gray-200 font-medium">
                        {new Date(fileDates.createdAt).toLocaleString(
                          settings.language === 'en' ? 'en-US' : 'ru-RU'
                        )}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Revision History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{t.autoSnapshotsNote}</span>
              <span className="text-[11px]">
                {file.revisions.length} {t.snapshotsRecorded}
              </span>
            </div>

            {file.revisions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 space-y-2">
                <History className="w-8 h-8 mx-auto opacity-30 text-accent" />
                <p className="text-xs">{t.noHistoryYet}</p>
                <p className="text-[11px] text-gray-400">{t.snapshotsCreatedOnSave}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {file.revisions.map((rev) => {
                  const isSelected = selectedRev?.id === rev.id;
                  const isDiffOpen = isSelected && showDiff;
                  return (
                    <div
                      key={rev.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent/5'
                          : 'border-base-border bg-black/20 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <GitCommit className="w-4 h-4 text-accent shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-gray-200">
                              {new Date(rev.timestamp).toLocaleString(
                                settings.language === 'en' ? 'en-US' : 'ru-RU'
                              )}
                            </span>
                            <span className="text-[11px] text-gray-400 ml-2 font-mono">
                              ({formatBytes(rev.content.length)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRev(isSelected ? null : rev);
                              setShowDiff(isSelected ? !showDiff : true);
                            }}
                            icon={isDiffOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          >
                            {isDiffOpen ? t.hideDiff : t.viewDiff}
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRestore(rev)}
                            icon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            {t.restore}
                          </Button>
                        </div>
                      </div>

                      {/* Diff View Container */}
                      {isDiffOpen && (
                        <div className="mt-3 pt-3 border-t border-base-border">
                          <div className="text-[11px] font-mono mb-2 flex items-center justify-between text-gray-400">
                            <span>{t.diffWithCurrent}</span>
                            <span className="text-[10px] text-gray-500">
                              - {t.revision} / + {t.current}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-black/50 border border-base-border text-[11px] font-mono max-h-52 overflow-y-auto custom-scrollbar space-y-0.5 leading-relaxed">
                            {renderDiff(rev.content).map((diffRow, idx) => (
                              <div
                                key={idx}
                                className={`px-1.5 py-0.5 rounded whitespace-pre-wrap break-all ${
                                  diffRow.type === 'added'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : diffRow.type === 'removed'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'text-gray-400 opacity-60'
                                }`}
                              >
                                {diffRow.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer justify="end">
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t.cancel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
