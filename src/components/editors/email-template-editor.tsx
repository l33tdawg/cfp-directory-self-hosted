'use client';

/**
 * Email Template Editor
 * 
 * Rich text editor specifically designed for email templates.
 * Includes headings, text alignment, and variable insertion.
 */

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Type,
  Variable,
  ChevronDown,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface EmailTemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables?: Record<string, string>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// TOOLBAR BUTTON
// =============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-slate-200 dark:bg-slate-700'
      )}
    >
      {children}
    </Button>
  );
}

// =============================================================================
// TOOLBAR
// =============================================================================

interface ToolbarProps {
  editor: Editor | null;
  variables?: Record<string, string>;
  onInsertVariable?: (variable: string) => void;
}

function Toolbar({ editor, variables, onInsertVariable }: ToolbarProps) {
  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    
    if (url === null) return;
    
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
  }, [editor]);

  const insertVariable = useCallback((variable: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`{${variable}}`).run();
    onInsertVariable?.(variable);
  }, [editor, onInsertVariable]);
  
  if (!editor) return null;
  
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-t-md">
      {/* Text Style Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
            <Type className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
            <Type className="h-4 w-4 mr-2" />
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-4 w-4 mr-2" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4 mr-2" />
            Heading 2
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
      
      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
      
      {/* Links */}
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        title="Add Link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      
      {editor.isActive('link') && (
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove Link"
        >
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
      )}

      {/* Variables Dropdown */}
      {variables && Object.keys(variables).length > 0 && (
        <>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 px-2">
                <Variable className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Insert Variable</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Available Variables</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(variables).map(([key, description]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => insertVariable(key)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {`{${key}}`}
                  </code>
                  <span className="text-xs text-slate-500">{description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      
      <div className="flex-1" />
      
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EmailTemplateEditor({
  content,
  onChange,
  variables,
  placeholder = 'Write your email content here...',
  disabled = false,
  className,
}: EmailTemplateEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:no-underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'focus:outline-none',
          'px-4 py-3',
          disabled && 'opacity-50 cursor-not-allowed'
        ),
        style: 'min-height: 300px; max-height: 500px; overflow-y: auto;',
      },
    },
  });
  
  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);
  
  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);
  
  return (
    <div
      className={cn(
        'rounded-md border border-slate-200 dark:border-slate-700',
        'focus-within:ring-2 focus-within:ring-blue-400 dark:focus-within:ring-blue-600',
        'focus-within:border-blue-400 dark:focus-within:border-blue-600',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Toolbar editor={editor} variables={variables} />
      
      <EditorContent editor={editor} />

      {/* Variables Quick Reference */}
      {variables && Object.keys(variables).length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-md">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Quick insert (click to add):
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.keys(variables).slice(0, 8).map((key) => (
              <Badge
                key={key}
                variant="outline"
                className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 text-xs"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().insertContent(`{${key}}`).run();
                  }
                }}
              >
                {`{${key}}`}
              </Badge>
            ))}
            {Object.keys(variables).length > 8 && (
              <Badge variant="secondary" className="text-xs">
                +{Object.keys(variables).length - 8} more
              </Badge>
            )}
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .dark .ProseMirror p.is-editor-empty:first-child::before {
          color: #6b7280;
        }
        
        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.5em 0;
        }
        
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.5em 0;
        }
        
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
        }
        
        .ProseMirror p {
          margin: 0.5em 0;
        }
        
        .ProseMirror p:first-child {
          margin-top: 0;
        }
        
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .ProseMirror [style*="text-align: center"] {
          text-align: center;
        }

        .ProseMirror [style*="text-align: right"] {
          text-align: right;
        }
      `}</style>
    </div>
  );
}

export default EmailTemplateEditor;
