declare module 'react-quill' {
  import * as React from 'react';

  export interface ReactQuillProps {
    theme?: string;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    readOnly?: boolean;
    modules?: Record<string, unknown>;
    formats?: string[];
    style?: React.CSSProperties;
    className?: string;
    onChange?: (value: string, delta: unknown, source: string, editor: unknown) => void;
    onChangeSelection?: (range: unknown, source: string, editor: unknown) => void;
    onFocus?: (range: unknown, source: string, editor: unknown) => void;
    onBlur?: (previousRange: unknown, source: string, editor: unknown) => void;
    onKeyDown?: React.KeyboardEventHandler;
    onKeyPress?: React.KeyboardEventHandler;
    onKeyUp?: React.KeyboardEventHandler;
    preserveWhitespace?: boolean;
    tabIndex?: number;
    bounds?: string | HTMLElement;
    children?: React.ReactNode;
  }

  export default class ReactQuill extends React.Component<ReactQuillProps> {}
}

declare module 'react-quill/dist/quill.snow.css' {
  const content: string;
  export default content;
}

declare module '@monaco-editor/react' {
  import * as React from 'react';

  export interface EditorProps {
    height?: string;
    width?: string;
    language?: string;
    value?: string;
    defaultValue?: string;
    theme?: string;
    options?: Record<string, unknown>;
    onChange?: (value: string | undefined, ev: unknown) => void;
    onMount?: (editor: {
      onDidBlurEditorWidget: (callback: () => void) => void;
      [key: string]: unknown;
    }, monaco: unknown) => void;
    beforeMount?: (monaco: unknown) => void;
    onValidate?: (markers: unknown[]) => void;
    loading?: React.ReactNode;
    className?: string;
  }

  export default function Editor(props: EditorProps): React.ReactElement;
}
