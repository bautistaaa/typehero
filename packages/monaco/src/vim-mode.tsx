'use client';

import type * as monaco from 'monaco-editor';
import { VimMode, initVimMode } from 'monaco-vim';
import { useEffect, useRef } from 'react';
import { DEFAULT_SETTINGS, useEditorSettingsStore } from './settings-store';

VimMode.Vim.defineEx('MonacoCommand', 'M', function monacoExCommand(ctx, { args }) {
  if (!args) {
    throw new TypeError('Expected an action to run');
  }

  let [command] = args;

  // workaround for vim mode not substituting `<Space>` with ` `
  if (command.startsWith('<Space>')) {
    command = command.slice(7);
  }

  ctx.editor.trigger('exCommand', command, null);
});

export function sourceVimCommands(cma: VimMode, vimCommands: string) {
  VimMode.Vim.mapclear();

  VimMode.Vim.maybeInitVimState_(cma);

  for (const line of vimCommands.split('\n')) {
    // skip comments
    if (line.startsWith('"')) continue;

    const trimmed = line.trim();

    // skip empty lines
    if (!trimmed) continue;

    VimMode.Vim.handleEx(cma, trimmed);
  }
}

interface VimStatusBarProps {
  editor: monaco.editor.IStandaloneCodeEditor;
}

export default function VimStatusBar({ editor }: VimStatusBarProps) {
  const statusBarRef = useRef<HTMLDivElement>(null);
  // NOTE: Maybe doesn't need to be a ref anymore?
  const vimModeRef = useRef<VimMode>(undefined);
  const { settings } = useEditorSettingsStore();

  useEffect(() => {
    if (settings.bindings === 'vim') {
      vimModeRef.current = initVimMode(editor, statusBarRef.current);

      sourceVimCommands(vimModeRef.current, settings.vimConfig || DEFAULT_SETTINGS.vimConfig);

      return () => vimModeRef.current?.dispose();
    }

    vimModeRef.current?.dispose();
    vimModeRef.current = undefined;

    if (statusBarRef.current) {
      statusBarRef.current.textContent = '';
    }
  }, [editor, settings.bindings, settings.vimConfig]);

  return (
    <div className="flex w-full">
      <div
        className="gap-2 p-2 font-mono text-sm [&>*:first-child]:mr-2 [&_input]:border-none [&_input]:bg-transparent [&_input]:outline-none"
        ref={statusBarRef}
      />
    </div>
  );
}
