'use client';

/**
 * Rich Text Editor
 * 
 * TipTap-based rich text editor with formatting toolbar,
 * character counting, and validation support.
 */

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  className?: string;
  showToolbar?: boolean;
  showCharacterCount?: boolean;
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
}

function Toolbar({ editor }: ToolbarProps) {
  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    
    if (url === null) {
      return;
    }
    
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    // Add https:// if no protocol is specified
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    
    editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
  }, [editor]);
  
  if (!editor) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-t-md">
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
      
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
      
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
      
      <div className="flex-1" />
      
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
// CHARACTER COUNT
// =============================================================================

interface CharacterCountDisplayProps {
  editor: Editor | null;
  minLength?: number;
  maxLength?: number;
}

function CharacterCountDisplay({ editor, minLength, maxLength }: CharacterCountDisplayProps) {
  if (!editor) return null;
  
  const characters = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();
  
  const isTooShort = minLength && characters < minLength;
  const isTooLong = maxLength && characters > maxLength;
  const isValid = !isTooShort && !isTooLong;
  
  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-md">
      <div className="flex items-center gap-4">
        <span>{words} words</span>
        <span
          className={cn(
            isTooShort && 'text-amber-600 dark:text-amber-400',
            isTooLong && 'text-red-600 dark:text-red-400',
            isValid && characters > 0 && 'text-green-600 dark:text-green-400'
          )}
        >
          {characters}
          {maxLength && ` / ${maxLength}`} characters
        </span>
      </div>
      {minLength && characters < minLength && (
        <span className="text-amber-600 dark:text-amber-400">
          {minLength - characters} more characters needed
        </span>
      )}
      {maxLength && characters > maxLength && (
        <span className="text-red-600 dark:text-red-400">
          {characters - maxLength} characters over limit
        </span>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  minLength,
  maxLength,
  minHeight = 150,
  maxHeight = 400,
  disabled = false,
  className,
  showToolbar = true,
  showCharacterCount = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings for simpler editor
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:no-underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount.configure({
        limit: maxLength,
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
          'px-3 py-2',
          disabled && 'opacity-50 cursor-not-allowed'
        ),
        style: `min-height: ${minHeight}px; max-height: ${maxHeight}px; overflow-y: auto;`,
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
        'focus-within:ring-2 focus-within:ring-slate-400 dark:focus-within:ring-slate-600',
        'focus-within:border-slate-400 dark:focus-within:border-slate-600',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {showToolbar && <Toolbar editor={editor} />}
      
      <EditorContent editor={editor} />
      
      {showCharacterCount && (
        <CharacterCountDisplay
          editor={editor}
          minLength={minLength}
          maxLength={maxLength}
        />
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
      `}</style>
    </div>
  );
}

// =============================================================================
// HELPER: Extract text from HTML
// =============================================================================

export function extractTextFromHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: simple regex-based extraction
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
  
  // Client-side: use DOM parser
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default RichTextEditor;
