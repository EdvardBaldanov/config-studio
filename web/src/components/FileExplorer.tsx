import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  FilePlus,
  RefreshCw,
  FileText,
  FileCode,
  Trash2,
  Edit2,
  UploadCloud,
  CornerLeftUp,
} from 'lucide-react';
import { FileItem, Settings, ContextMenuItem, ContextMenuTarget } from '../types';
import { translations } from '../utils/i18n';
import { ContextMenu } from './ContextMenu';
import { contextMenuRegistry } from '../services/contextMenuRegistry';

interface FileExplorerProps {
  items: FileItem[];
  currentDir: string;
  selectedFilePath: string | null;
  settings: Settings;
  onSelectFile: (path: string) => void;
  onNavigateDir: (path: string) => void;
  onRefresh: () => void;
  onCreateItem: (path: string, isDir: boolean) => void;
  onDeleteItem: (path: string) => void;
  onRenameItem: (oldPath: string, newPath: string) => void;
  onUploadFile: (dirPath: string, file: File) => void;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  items = [],
  currentDir,
  selectedFilePath,
  settings,
  onSelectFile,
  onNavigateDir,
  onRefresh,
  onCreateItem,
  onDeleteItem,
  onRenameItem,
  onUploadFile,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<{
    x: number;
    y: number;
    target: ContextMenuTarget;
  } | null>(null);
  const [, setRegistryTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[settings.language] || translations.ru;
  const safeItems = items || [];

  useEffect(() => {
    return contextMenuRegistry.subscribe(() => {
      setRegistryTick((prev) => prev + 1);
    });
  }, []);

  const getContextMenuItems = (target: ContextMenuTarget): ContextMenuItem[] => {
    const coreItems: ContextMenuItem[] = [];

    if (target.name) {
      // 1. Group 'open'
      if (!target.isDir) {
        coreItems.push({
          id: 'core.open',
          label: t.ctxOpen || 'Открыть',
          icon: 'FileCode',
          group: 'open',
          order: 10,
          onClick: () => onSelectFile(target.path),
        });
      } else {
        coreItems.push({
          id: 'core.open-folder',
          label: t.ctxOpenFolder || 'Открыть папку',
          icon: 'Folder',
          group: 'open',
          order: 10,
          onClick: () => onNavigateDir(target.path),
        });
      }

      // 2. Group 'clipboard'
      coreItems.push({
        id: 'core.copy-path',
        label: t.ctxCopyPath || 'Копировать относительный путь',
        icon: 'Copy',
        group: 'clipboard',
        order: 10,
        shortcut: 'Ctrl+C',
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(target.path);
          } catch {
            const ta = document.createElement('textarea');
            ta.value = target.path;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          }
        },
      });

      // 3. Group 'edit' (New item inside this folder if target is directory)
      if (target.isDir) {
        coreItems.push({
          id: 'core.new-file-here',
          label: t.ctxNewFileHere || 'Новый файл...',
          icon: 'FilePlus',
          group: 'edit',
          order: 10,
          onClick: () => {
            const name = prompt(t.enterFileName);
            if (!name || !name.trim()) return;
            const fullPath = `${target.path}/${name.trim()}`;
            onCreateItem(fullPath, false);
          },
        });
        coreItems.push({
          id: 'core.new-folder-here',
          label: t.ctxNewFolderHere || 'Новая папка...',
          icon: 'FolderPlus',
          group: 'edit',
          order: 20,
          onClick: () => {
            const name = prompt(t.enterFolderName);
            if (!name || !name.trim()) return;
            const fullPath = `${target.path}/${name.trim()}`;
            onCreateItem(fullPath, true);
          },
        });
      }

      // Rename
      coreItems.push({
        id: 'core.rename',
        label: t.ctxRename || 'Переименовать',
        icon: 'Edit2',
        group: 'edit',
        order: 30,
        shortcut: 'F2',
        onClick: () => {
          const newName = prompt(t.enterNewName, target.name);
          if (!newName || !newName.trim() || newName.trim() === target.name) return;
          const dir = target.path.includes('/')
            ? target.path.substring(0, target.path.lastIndexOf('/'))
            : '';
          const newPath = dir ? `${dir}/${newName.trim()}` : newName.trim();
          onRenameItem(target.path, newPath);
        },
      });

      // 4. Group 'danger' (Delete)
      coreItems.push({
        id: 'core.delete',
        label: t.ctxDelete || 'Удалить',
        icon: 'Trash2',
        group: 'danger',
        order: 90,
        shortcut: 'Del',
        onClick: () => {
          const msg = t.deleteConfirm.replace('{name}', target.name);
          if (confirm(msg)) {
            onDeleteItem(target.path);
          }
        },
      });
    } else {
      // Empty explorer background actions
      coreItems.push({
        id: 'core.new-file',
        label: t.ctxNewFileHere || 'Новый файл...',
        icon: 'FilePlus',
        group: 'edit',
        order: 10,
        onClick: () => handleCreatePrompt(false),
      });
      coreItems.push({
        id: 'core.new-folder',
        label: t.ctxNewFolderHere || 'Новая папка...',
        icon: 'FolderPlus',
        group: 'edit',
        order: 20,
        onClick: () => handleCreatePrompt(true),
      });
      coreItems.push({
        id: 'core.refresh',
        label: t.ctxRefresh || 'Обновить',
        icon: 'RefreshCw',
        group: 'tools',
        order: 10,
        onClick: onRefresh,
      });
    }

    // Get plugin-registered items for this target
    const pluginItems = contextMenuRegistry.getItemsForTarget(target);

    // Combine and sort
    const groupOrder: Record<string, number> = {
      open: 1,
      clipboard: 2,
      tools: 3,
      edit: 4,
      danger: 5,
    };

    const allItems = [...coreItems, ...pluginItems];
    return allItems.sort((a, b) => {
      const gA = groupOrder[a.group || 'tools'] ?? 99;
      const gB = groupOrder[b.group || 'tools'] ?? 99;
      if (gA !== gB) return gA - gB;
      const oA = a.order ?? 50;
      const oB = b.order ?? 50;
      return oA - oB;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        onUploadFile(currentDir, e.dataTransfer.files[i]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        onUploadFile(currentDir, e.target.files[i]);
      }
    }
  };

  const handleCreatePrompt = (isDir: boolean) => {
    const promptMsg = isDir ? t.enterFolderName : t.enterFileName;
    const name = prompt(promptMsg);
    if (!name || !name.trim()) return;
    const fullPath = currentDir ? `${currentDir}/${name.trim()}` : name.trim();
    onCreateItem(fullPath, isDir);
  };

  const handleRenamePrompt = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt(t.enterNewName, item.name);
    if (!newName || !newName.trim() || newName.trim() === item.name) return;
    const dir = item.path.includes('/')
      ? item.path.substring(0, item.path.lastIndexOf('/'))
      : '';
    const newPath = dir ? `${dir}/${newName.trim()}` : newName.trim();
    onRenameItem(item.path, newPath);
  };

  const handleDeleteConfirm = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = t.deleteConfirm.replace('{name}', item.name);
    if (confirm(msg)) {
      onDeleteItem(item.path);
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.isDir) {
      return <Folder className="w-4 h-4 text-accent flex-shrink-0" />;
    }
    const ext = (item.extension || '').toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      return <FileCode className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
    }
    if (ext === '.json') {
      return <FileCode className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    }
    if (ext === '.toml') {
      return <FileCode className="w-4 h-4 text-purple-500 flex-shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />;
  };

  const goUp = () => {
    if (!currentDir) return;
    const parts = currentDir.split('/');
    parts.pop();
    onNavigateDir(parts.join('/'));
  };

  const explorerAside = (
    <aside className="w-72 sm:w-64 bg-base-surface border-r border-base-border flex flex-col h-full select-none flex-shrink-0">
      {/* Title & Toolbar */}
      <div className="p-3 border-b border-base-border flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t.fileExplorer}
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleCreatePrompt(false)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title={t.newFile}
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleCreatePrompt(true)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title={t.newFolder}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title={t.refresh}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className="md:hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Закрыть"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Directory path & parent navigation */}
      {currentDir && (
        <div
          onClick={goUp}
          className="px-3 py-2 sm:py-1.5 flex items-center space-x-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-base-border"
          title="Go up"
        >
          <CornerLeftUp className="w-3.5 h-3.5 text-accent" />
          <span className="truncate font-mono">.. ({currentDir})</span>
        </div>
      )}

      {/* Files List */}
      <div
        className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar"
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuState({
            x: e.clientX,
            y: e.clientY,
            target: {
              path: currentDir,
              name: '',
              isDir: true,
              extension: '',
              currentDir,
            },
          });
        }}
      >
        {safeItems.length === 0 ? (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
            <Folder className="w-8 h-8 mx-auto mb-2 opacity-30 text-accent" />
            <p>{t.emptyFolder}</p>
          </div>
        ) : (
          safeItems.map((item) => {
            const isSelected = selectedFilePath === item.path;
            return (
              <div
                key={item.path}
                onClick={() => {
                  if (item.isDir) {
                    onNavigateDir(item.path);
                  } else {
                    onSelectFile(item.path);
                    onCloseMobileDrawer?.();
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenuState({
                    x: e.clientX,
                    y: e.clientY,
                    target: {
                      path: item.path,
                      name: item.name,
                      isDir: item.isDir,
                      extension: item.extension || '',
                      currentDir,
                    },
                  });
                }}
                className={`group flex items-center justify-between px-2.5 py-2 sm:py-1.5 rounded-xl text-xs cursor-pointer min-h-[36px] sm:min-h-[30px] transition-colors ${
                  isSelected
                    ? 'bg-accent/15 text-gray-900 dark:text-white font-medium border border-accent/40 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 truncate min-w-0">
                  {getFileIcon(item)}
                  <span className="truncate">{item.name}</span>
                </div>

                {/* Action buttons on hover */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pl-1 flex-shrink-0 transition-opacity">
                  <button
                    onClick={(e) => handleRenamePrompt(item, e)}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/20 text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title={t.rename}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteConfirm(item, e)}
                    className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-500"
                    title={t.delete}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Dropzone at Bottom */}
      <div className="p-3 border-t border-base-border">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-3 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-accent bg-accent/10'
              : 'border-gray-300 dark:border-white/10 hover:border-accent/60 bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/30'
          }`}
        >
          <UploadCloud className="w-5 h-5 mx-auto mb-1 text-accent opacity-90" />
          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">
            {t.dropFiles}
          </p>
          <p className="text-[10px] text-accent mt-0.5 hover:underline font-semibold">
            {t.clickToUpload}
          </p>
        </div>
      </div>

      {/* Context Menu Modal / Popup */}
      {contextMenuState && (
        <ContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          items={getContextMenuItems(contextMenuState.target)}
          target={contextMenuState.target}
          onClose={() => setContextMenuState(null)}
        />
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop view (always visible on md+) */}
      <div className="hidden md:flex h-full flex-shrink-0">
        {explorerAside}
      </div>

      {/* Mobile Drawer (visible on < md when open) */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex animate-in fade-in duration-200">
          <div className="h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {explorerAside}
          </div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobileDrawer}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
};
