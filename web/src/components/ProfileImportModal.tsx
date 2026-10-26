import React, { useState } from 'react';
import {
  Share2,
  Check,
  Palette,
  Globe,
  Package,
} from 'lucide-react';
import { ProfilePreview } from '../types';
import { translations } from '../utils/i18n';
import { Modal, Button, Toggle, Badge } from './ui';

interface ProfileImportModalProps {
  isOpen: boolean;
  preview: ProfilePreview | null;
  isImporting?: boolean;
  language?: string;
  onClose: () => void;
  onConfirm: (options: {
    applySettings: boolean;
    importSources: boolean;
    autoInstallPlugins: boolean;
  }) => Promise<void>;
}

export const ProfileImportModal: React.FC<ProfileImportModalProps> = ({
  isOpen,
  preview,
  isImporting = false,
  language = 'ru',
  onClose,
  onConfirm,
}) => {
  const [applySettings, setApplySettings] = useState(true);
  const [importSources, setImportSources] = useState(true);
  const [autoInstallPlugins, setAutoInstallPlugins] = useState(true);

  if (!isOpen || !preview) return null;

  const t = translations[language] || translations.ru;
  const profile = preview.profile || { exportedAt: '', app: {}, sources: [], plugins: [] };
  const settingsDiff = preview.settingsDiff || [];
  const newSources = preview.newSources || [];
  const pluginsStatus = preview.pluginsStatus || [];

  const toInstallCount = pluginsStatus.filter((p) => p?.action === 'to_install').length;
  const toEnableCount = pluginsStatus.filter((p) => p?.action === 'will_enable').length;

  const exportDateStr = profile.exportedAt
    ? new Date(profile.exportedAt).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU')
    : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Header
        icon={
          <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center border border-accent/20">
            <Share2 size={18} />
          </div>
        }
        title={t.importProfileModalTitle}
        subtitle={`${t.exportedAtLabel}: ${exportDateStr}`}
        badge={<Badge variant="accent" size="sm">PROFILE</Badge>}
        onClose={onClose}
      />

      <Modal.Body className="p-5 sm:p-6 space-y-4">
        {/* Section 1: Settings diff */}
        <div className="p-4 rounded-xl border border-base-border bg-black/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-gray-200">
                {t.sectionAppSettings}
              </span>
              <Badge variant="neutral" size="sm">
                {settingsDiff.length} {t.changesCount}
              </Badge>
            </div>
            <Toggle
              checked={applySettings}
              onChange={setApplySettings}
              size="sm"
            />
          </div>

          {applySettings && settingsDiff.length > 0 && (
            <div className="pt-2 border-t border-base-border/50 space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
              {settingsDiff.map((diff, idx) => (
                <p key={idx} className="text-xs text-gray-400 font-mono">
                  • {diff}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Sources */}
        <div className="p-4 rounded-xl border border-base-border bg-black/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-gray-200">
                {t.sectionCatalogSources}
              </span>
              {newSources.length > 0 ? (
                <Badge variant="accent" size="sm">
                  +{newSources.length} {t.newSourcesCount}
                </Badge>
              ) : (
                <span className="text-[11px] text-gray-500">({t.noNewSources})</span>
              )}
            </div>
            <Toggle
              checked={importSources}
              onChange={setImportSources}
              disabled={newSources.length === 0}
              size="sm"
            />
          </div>

          {importSources && newSources.length > 0 && (
            <div className="pt-2 border-t border-base-border/50 space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
              {newSources.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-200 font-medium">{s.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono truncate max-w-[220px]">
                    {s.url}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Plugins */}
        <div className="p-4 rounded-xl border border-base-border bg-black/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-gray-200">
                {t.sectionPluginsSync}
              </span>
              <div className="flex items-center gap-1.5">
                {toInstallCount > 0 && (
                  <Badge variant="success" size="sm">
                    {toInstallCount} {t.toInstallBadge}
                  </Badge>
                )}
                {toEnableCount > 0 && (
                  <Badge variant="accent" size="sm">
                    {toEnableCount} {t.toEnableBadge}
                  </Badge>
                )}
              </div>
            </div>
            <Toggle
              checked={autoInstallPlugins}
              onChange={setAutoInstallPlugins}
              size="sm"
            />
          </div>

          {autoInstallPlugins && pluginsStatus.length > 0 && (
            <div className="pt-2 border-t border-base-border/50 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {pluginsStatus.map((p) => {
                let badge = (
                  <Badge variant="neutral" size="sm">
                    {t.actionNone}
                  </Badge>
                );
                if (p.action === 'to_install') {
                  badge = (
                    <Badge variant="success" size="sm">
                      {t.actionInstall}
                    </Badge>
                  );
                } else if (p.action === 'will_enable') {
                  badge = (
                    <Badge variant="accent" size="sm">
                      {t.actionEnable}
                    </Badge>
                  );
                }

                return (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">
                      {p.name || p.id}{' '}
                      <span className="text-[10px] text-gray-500 font-mono">
                        v{p.version}
                      </span>
                    </span>
                    {badge}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer justify="end">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={isImporting}
        >
          {t.cancel}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            onConfirm({ applySettings, importSources, autoInstallPlugins })
          }
          disabled={
            isImporting ||
            (!applySettings && !importSources && !autoInstallPlugins)
          }
          loading={isImporting}
          icon={<Check className="w-4 h-4" />}
        >
          {t.applyProfile}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
