'use client';

import { type OnChange, type OnMount, type OnValidate } from '@monaco-editor/react';
import { useToast } from '@repo/ui/components/use-toast';
import { setupTypeAcquisition } from '@typescript/ata';
import clsx from 'clsx';
import debounce from 'lodash/debounce';
import type * as monacoType from 'monaco-editor';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import ts from 'typescript';
import { CodeEditor } from './code-editor';
import { useResetEditor } from './editor-hooks';
import { PrettierFormatProvider } from './prettier';
import { useEditorSettingsStore } from './settings-store';
import { createTwoslashInlayProvider } from './twoslash/provider';
import { getEventDeltas } from './utils';

/** these types are dynamically fetched on load and used to add node types to the monaco instance */
const NECESSARY_NODE_TYPES = ['process'];

function preventSelection(event: Event) {
  event.preventDefault();
}

const VimStatusBar = dynamic(() => import('./vim-mode'), {
  ssr: false,
});

const MIN_HEIGHT = 150;
const COLLAPSE_THRESHOLD = MIN_HEIGHT / 2;
const USER_FILE_PATH = 'node_modules/@types/user.d.ts';
const TEST_FILE_PATH = 'node_modules/@types/test.d.ts';

export const TESTS_PATH = 'file:///tests.ts';
export const USER_CODE_PATH = 'file:///user.ts';

export interface SplitEditorProps {
  /** the classes applied to the container div */
  className?: string;
  expandTestPanel: boolean;
  setIsTestPanelExpanded: (isExpanded: boolean) => void;
  tests: string;
  userCode: string;
  tsconfig?: monacoType.languages.typescript.CompilerOptions;
  onValidate?: {
    tests?: OnValidate;
    user?: OnValidate;
  };
  onMount?: {
    tests?: OnMount;
    user?: OnMount;
  };
  onChange?: {
    tests?: OnChange;
    user?: OnChange;
  };
  monaco: typeof import('monaco-editor') | undefined;
  userEditorState?: monacoType.editor.IStandaloneCodeEditor;
  isTestsReadonly?: boolean;
}

export const hasImports = (code: string) => {
  return code.split('\n').some((line) => line.trim().startsWith('import'));
};

const getActualCode = (code: string) =>
  code
    .split('\n')
    .filter((c) => !c.trim().startsWith('import'))
    .join('\n');

// million-ignore
export default function SplitEditor({
  className,
  isTestsReadonly = true,
  expandTestPanel,
  monaco,
  onChange,
  onMount,
  onValidate,
  setIsTestPanelExpanded,
  tests,
  userCode,
  userEditorState,
  tsconfig,
}: SplitEditorProps) {
  const { toast } = useToast();
  const { settings, updateSettings } = useEditorSettingsStore();
  const { subscribe } = useResetEditor();

  const wrapper = useRef<HTMLDivElement>(null);
  const resizer = useRef<HTMLDivElement>(null);
  const testPanel = useRef<HTMLDivElement>(null);
  const testPanelSection = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<typeof import('monaco-editor')>(undefined);
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor>(undefined);

  useEffect(() => {
    const saveHandler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.code === 'KeyS' &&
        wrapper.current?.contains(document.activeElement)
      ) {
        e.preventDefault();
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
        toast({
          title: 'Saved',
          description: 'Your code has been saved',
          duration: 1000,
          variant: 'success',
        });
      }
    };

    document.addEventListener('keydown', saveHandler);

    return () => {
      document.removeEventListener('keydown', saveHandler);
    };
  }, [editorRef]);

  useEffect(() => {
    monacoRef.current = monaco;
  }, [monaco]);
  useEffect(() => {
    editorRef.current = userEditorState;
  }, [userEditorState]);

  // i moved this into onMount to avoid the monacoRef stuff but then you can really debounce it
  const [ata] = useState(() =>
    setupTypeAcquisition({
      projectName: 'TypeHero Playground',
      typescript: ts,
      logger: console,
      delegate: {
        // NOTE: this gets cached so it wont execute if you comment out an import and uncomment it.
        // it will only be called the first time
        receivedFile: (code: string, _path: string) => {
          if (!monacoRef.current || !editorRef.current) {
            return;
          }
          const path = `file://${_path}`;
          const uri = monacoRef.current.Uri.parse(path);
          const model = monacoRef.current.editor.getModel(uri);
          if (!model) {
            monacoRef.current.languages.typescript.typescriptDefaults.addExtraLib(code, path);
            monacoRef.current.editor.createModel(code, 'typescript', uri);
          }

          const userCode =
            monacoRef.current.editor
              .getModel(monacoRef.current.Uri.parse(USER_CODE_PATH))
              ?.getValue() ?? '';

          const testCode =
            monacoRef.current.editor
              .getModel(monacoRef.current.Uri.parse(TESTS_PATH))
              ?.getValue() ?? '';

          if (hasImports(userCode)) {
            monacoRef.current.languages.typescript.typescriptDefaults.addExtraLib(
              getActualCode(userCode),
              USER_FILE_PATH,
            );
          }

          if (hasImports(testCode)) {
            monacoRef.current.languages.typescript.typescriptDefaults.addExtraLib(
              getActualCode(testCode),
              TEST_FILE_PATH,
            );
          }

          onMount?.tests?.(editorRef.current, monacoRef.current);
        },
      },
    }),
  );

  const debouncedUserCodeAta = useRef(debounce((code: string) => ata(code), 1000)).current;
  const debouncedTestCodeAta = useRef(debounce((code: string) => ata(code), 1000)).current;

  useEffect(() => {
    const resizerRef = resizer.current;
    const testPanelRef = testPanel.current;
    const testPanelSectionRef = testPanelSection.current;
    const wrapperRef = wrapper.current;

    if (!resizerRef || !testPanelRef || !wrapperRef || !testPanelSectionRef) {
      return;
    }

    let y = 0;
    let initialHeight = testPanelRef.offsetHeight;

    const mouseMoveHandler = (e: MouseEvent | TouchEvent) => {
      // Remove transition during drag because of performance issues
      if (testPanelSectionRef.classList.contains('transition-all')) {
        testPanelSectionRef.classList.remove('transition-all');
      }

      document.body.style.setProperty('cursor', 'row-resize');

      const { dy } = getEventDeltas(e, { x: 0, y });

      const height = initialHeight - dy;

      if (height >= MIN_HEIGHT) {
        const newHeight = Math.min(height, wrapperRef.offsetHeight - 55);
        testPanelRef.style.height = `${newHeight}px`;
        setIsTestPanelExpanded(true);
      } else if (height < COLLAPSE_THRESHOLD) {
        setIsTestPanelExpanded(false);
      }
    };

    const mouseDownHandler = (e: MouseEvent | TouchEvent) => {
      initialHeight = testPanelRef.offsetHeight;

      if (e instanceof MouseEvent) {
        y = e.clientY;
      } else if (e instanceof TouchEvent) {
        y = e.touches[0]?.clientY ?? 0;
      }

      if (e instanceof MouseEvent) {
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      } else if (e instanceof TouchEvent) {
        document.addEventListener('touchmove', mouseMoveHandler);
        document.addEventListener('touchend', mouseUpHandler);
      }

      // Prevent selection during drag
      document.addEventListener('selectstart', preventSelection);
    };

    const mouseUpHandler = function () {
      // Restore transition
      testPanelSectionRef.classList.add('transition-all');

      document.body.style.removeProperty('cursor');

      document.removeEventListener('touchmove', mouseMoveHandler);
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('touchend', mouseUpHandler);
      document.removeEventListener('mouseup', mouseUpHandler);

      // Restore selection
      document.removeEventListener('selectstart', preventSelection);

      updateSettings({
        ...settings,
        testPanelHeight:
          testPanelRef.offsetHeight < MIN_HEIGHT ? MIN_HEIGHT : testPanelRef.offsetHeight,
      });
    };

    const resizeHandler = () => {
      if (testPanelRef.offsetHeight >= MIN_HEIGHT) {
        testPanelRef.style.height = `${Math.min(
          testPanelRef.offsetHeight,
          wrapperRef.offsetHeight - 55,
        )}px`;
        setIsTestPanelExpanded(true);
      } else {
        setIsTestPanelExpanded(false);
      }
    };

    window.addEventListener('resize', resizeHandler);
    resizerRef.addEventListener('mousedown', mouseDownHandler);
    resizerRef.addEventListener('touchstart', mouseDownHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      resizerRef.removeEventListener('mousedown', mouseDownHandler);
      resizerRef.removeEventListener('touchstart', mouseDownHandler);
    };
  }, [settings, updateSettings, setIsTestPanelExpanded]);

  subscribe(
    'resetCode',
    () => {
      if (monaco && userEditorState) {
        onMount?.tests?.(userEditorState, monaco);
      }
    },
    [monaco, userEditorState],
  );

  const inlayHintsRef = useRef<monacoType.IDisposable | null>(null);

  const debouncedRefreshInlayHints = useRef(
    debounce(async (monaco: typeof monacoType) => {
      inlayHintsRef.current?.dispose();

      // TODO: Surely monaco is guaranteed to exist, right? Why the optional chaining?
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      const model = monaco?.editor.getModel(monaco.Uri.parse(USER_CODE_PATH))!;
      const getTsWorker = await monaco?.languages.typescript.getTypeScriptWorker();
      const tsWorker = await getTsWorker?.(model.uri);

      inlayHintsRef.current = monaco?.languages.registerInlayHintsProvider(
        'typescript',
        createTwoslashInlayProvider(monaco, tsWorker),
      );
    }, 1000),
  ).current;

  useEffect(
    () => () => {
      inlayHintsRef.current?.dispose();
    },
    [],
  );

  return (
    <div className={clsx('flex h-[calc(100%-_90px)] flex-col', className)} ref={wrapper}>
      <section
        id="code-editor"
        tabIndex={-1}
        className="h-full overflow-hidden focus:border focus:border-blue-500"
      >
        <CodeEditor
          className="overflow-hidden"
          height={userEditorState && settings.bindings === 'vim' ? 'calc(100% - 36px)' : '100%'}
          defaultPath={USER_CODE_PATH}
          onMount={async (editor, monaco) => {
            // this just does the typechecking so the UI can update
            // it also makes the monaco instance available outside of this callback by setting state in parent
            onMount?.user?.(editor, monaco);
            typeCheck(monaco);
            monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

            const model = monaco.editor.getModel(monaco.Uri.parse(USER_CODE_PATH))!;
            const code = model.getValue();
            debouncedUserCodeAta(code);

            async function addNodeTypesToMonaco() {
              try {
                // Fetch the main Node types index file
                const baseUrl = 'https://unpkg.com/@types/node/';
                const indexResponse = await fetch(`${baseUrl}index.d.ts`);

                if (!indexResponse.ok) {
                  console.error('Failed to load Node.js types:', indexResponse.statusText);
                  return;
                }
                const indexContent = await indexResponse.text();

                // Add the main index.d.ts file
                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                  indexContent,
                  'file:///node_modules/@types/node/index.d.ts',
                );

                // Extract all referenced files from the index.d.ts
                const referenceRegex = /\/\/\/ <reference path="(.+?)" \/>/g;
                const referencedFiles = [];
                let match;
                while ((match = referenceRegex.exec(indexContent)) !== null) {
                  const x = match[1] ?? '';
                  if (NECESSARY_NODE_TYPES.some((type) => x.includes(type))) {
                    referencedFiles.push(match[1]);
                  }
                }

                // Fetch each referenced file and add it to Monaco
                await Promise.all(
                  referencedFiles.map(async (file) => {
                    const response = await fetch(`${baseUrl}${file}`);
                    const content = await response.text();
                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                      content,
                      `file:///node_modules/@types/node/${file}`,
                    );
                  }),
                );

                // Restart the Monaco worker to make sure types are recognized
                monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
              } catch (error) {
                console.error('Failed to load Node.js types:', error);
              }
            }

            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
              allowNonTsExtensions: true,
              strict: true,
              target: monaco.languages.typescript.ScriptTarget.ESNext,
              strictNullChecks: true,
              moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
              allowSyntheticDefaultImports: true,
              outDir: 'lib', // kills the override input file error
              ...tsconfig,
            });
            addNodeTypesToMonaco();

            monaco.languages.registerDocumentFormattingEditProvider(
              'typescript',
              PrettierFormatProvider,
            );

            const getTsWorker = await monaco.languages.typescript.getTypeScriptWorker();
            const tsWorker = await getTsWorker(model.uri);

            inlayHintsRef.current = monaco.languages.registerInlayHintsProvider(
              'typescript',
              createTwoslashInlayProvider(monaco, tsWorker),
            );

            if (hasImports(code)) {
              const actualCode = code
                .split('\n')
                .filter((c) => !c.trim().startsWith('import'))
                .join('\n');
              if (actualCode) {
                monaco.languages.typescript.typescriptDefaults.setExtraLibs([
                  {
                    content: actualCode,
                    filePath: USER_FILE_PATH,
                  },
                ]);
              }
            }
          }}
          defaultValue={userCode}
          value={userCode}
          onValidate={onValidate?.user}
          onChange={(value, changeEvent) => {
            const code = value ?? '';
            debouncedUserCodeAta(code);
            if (hasImports(code)) {
              const actualCode = code
                .split('\n')
                .filter((c) => !c.trim().startsWith('import'))
                .join('\n');
              if (actualCode) {
                monaco?.languages.typescript.typescriptDefaults.setExtraLibs([
                  {
                    content: actualCode,
                    filePath: USER_FILE_PATH,
                  },
                ]);
              }
              // we'll need to typecheck tests here in the event that you uncomment the same import
              // because `receivedFile` wont be called again
              setTimeout(() => {
                // send to next tick
                onMount?.tests?.(editorRef.current!, monacoRef.current!);
              });
            } else {
              // we want to blow away the user.d.ts because
              // 1. its no longer needed
              // 2. so you dont get duplicate type errors if you add imports back in
              monaco?.languages.typescript.typescriptDefaults.addExtraLib('', USER_FILE_PATH);
            }
            onChange?.user?.(value, changeEvent);

            debouncedRefreshInlayHints(monaco!);
            typeCheck(monaco!);
          }}
        />
        {userEditorState && settings.bindings === 'vim' && (
          <VimStatusBar editor={userEditorState} />
        )}
      </section>
      <div className="transition-all" ref={testPanelSection}>
        <div
          className="group cursor-row-resize border-y border-zinc-200 bg-zinc-100 p-2 dark:border-zinc-700 dark:bg-zinc-800"
          ref={resizer}
          onDoubleClick={() => {
            setIsTestPanelExpanded(false);
          }}
        >
          <div className="group-hover:bg-primary group-hover:dark:bg-primary group-active:bg-primary m-auto h-1 w-24 rounded-full bg-zinc-300 duration-300 dark:bg-zinc-700" />
        </div>
        <div
          style={{
            height: `${expandTestPanel ? settings.testPanelHeight || MIN_HEIGHT : 0}px`,
          }}
          ref={testPanel}
        >
          <CodeEditor
            options={{
              lineNumbers: 'off',
              renderValidationDecorations: 'on',
              readOnly: isTestsReadonly,
            }}
            onMount={(editor, monaco) => {
              // this just does the typechecking so the UI can update
              onMount?.tests?.(editor, monaco);
              const testModel = monaco.editor.getModel(monaco.Uri.parse(TESTS_PATH))!;
              const testCode = testModel.getValue();
              debouncedTestCodeAta(testCode);

              if (hasImports(testCode)) {
                const actualCode = testCode
                  .split('\n')
                  .filter((c) => !c.startsWith('import'))
                  .join('\n');
                if (actualCode) {
                  monaco.languages.typescript.typescriptDefaults.setExtraLibs([
                    {
                      content: actualCode,
                      filePath: TEST_FILE_PATH,
                    },
                  ]);
                }
              }
            }}
            defaultPath={TESTS_PATH}
            value={tests}
            defaultValue={tests}
            onChange={(editor, changeEvent) => {
              const code = editor ?? '';
              debouncedTestCodeAta(code);
              if (hasImports(code)) {
                const actualCode = code
                  .split('\n')
                  .filter((c) => !c.startsWith('import'))
                  .join('\n');
                if (actualCode) {
                  monaco?.languages.typescript.typescriptDefaults.setExtraLibs([
                    {
                      content: actualCode,
                      filePath: TEST_FILE_PATH,
                    },
                  ]);
                }
              }

              onChange?.tests?.(editor, changeEvent);
            }}
            onValidate={onValidate?.tests}
          />
        </div>
      </div>
    </div>
  );
}

async function typeCheck(monaco: typeof monacoType) {
  const models = monaco.editor.getModels();
  const getWorker = await monaco.languages.typescript.getTypeScriptWorker();

  for (const model of models) {
    const worker = await getWorker(model.uri);
    const diagnostics = (
      await Promise.all([
        worker.getSyntacticDiagnostics(model.uri.toString()),
        worker.getSemanticDiagnostics(model.uri.toString()),
      ])
    ).reduce((a, b) => a.concat(b));

    const markers = diagnostics.map((d) => {
      const start = model.getPositionAt(d.start!);
      const end = model.getPositionAt(d.start! + d.length!);

      return {
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: start.lineNumber,
        endLineNumber: end.lineNumber,
        startColumn: start.column,
        endColumn: end.column,
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      } satisfies monacoType.editor.IMarkerData;
    });

    monaco.editor.setModelMarkers(model, model.getLanguageId(), markers);
  }
}
