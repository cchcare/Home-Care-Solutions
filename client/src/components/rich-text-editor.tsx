import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Node, mergeAttributes } from '@tiptap/core';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Undo, Redo, Quote, Code,
  Link as LinkIcon, Image as ImageIcon, Video, Minus, RemoveFormatting,
} from 'lucide-react';
import { useEffect, useRef, useCallback, useState } from 'react';

// ── Custom Video Embed Node ────────────────────────────────────────────────────
const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const { src } = HTMLAttributes;
    if (!src) return ['div', { 'data-video-embed': 'true' }, 'Video'];
    let embedSrc = src;
    const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return [
      'div',
      mergeAttributes({ 'data-video-embed': 'true', class: 'my-4 rounded-lg overflow-hidden' }),
      ['iframe', { src: embedSrc, width: '100%', height: '360', frameborder: '0', allowfullscreen: 'true', class: 'w-full rounded-lg aspect-video' }],
    ];
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing…',
  className = '',
  editable = true,
  onImageUpload,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoOpen, setVideoOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Image.configure({ allowBase64: true, inline: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      VideoEmbed,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[250px] p-4 dark:prose-invert',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl('');
    setLinkOpen(false);
  }, [editor, linkUrl]);

  const insertVideo = useCallback(() => {
    if (!editor || !videoUrl) return;
    editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: videoUrl } }).run();
    setVideoUrl('');
    setVideoOpen(false);
  }, [editor, videoUrl]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor) return;
    if (onImageUpload) {
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        return;
      } catch {}
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  }, [editor, onImageUpload]);

  if (!editor) return null;

  return (
    <div className={`border rounded-lg overflow-hidden bg-background ${className}`}>
      {editable && (
        <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1 items-center">
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Toggle size="sm" pressed={editor.isActive('heading', { level: 1 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
            <Heading1 className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
            <Heading2 className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('heading', { level: 3 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
            <Heading3 className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('blockquote')} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
            <Quote className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive('codeBlock')} onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
            <Code className="h-4 w-4" />
          </Toggle>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
            <Minus className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'left' })} onPressedChange={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'center' })} onPressedChange={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'right' })} onPressedChange={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">
            <AlignRight className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive({ textAlign: 'justify' })} onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">
            <AlignJustify className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Text color */}
          <label title="Text color" className="cursor-pointer">
            <Toggle size="sm" pressed={false} onPressedChange={() => {}} asChild>
              <span className="relative inline-flex items-center justify-center">
                <span className="text-xs font-bold select-none" style={{ color: editor.getAttributes('textStyle').color || 'currentColor' }}>A</span>
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  title="Text color"
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                />
              </span>
            </Toggle>
          </label>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Link */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <Toggle size="sm" pressed={editor.isActive('link')} onPressedChange={() => setLinkOpen(v => !v)} title="Insert link">
                <LinkIcon className="h-4 w-4" />
              </Toggle>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" onKeyDown={(e) => e.key === 'Enter' && insertLink()} autoFocus />
                <div className="flex gap-2">
                  <Button size="sm" onClick={insertLink}>Insert</Button>
                  {editor.isActive('link') && (
                    <Button size="sm" variant="outline" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}>Remove</Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Toggle size="sm" pressed={false} onPressedChange={() => imageInputRef.current?.click()} title="Insert image">
            <ImageIcon className="h-4 w-4" />
          </Toggle>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = '';
            }}
          />

          {/* Video Embed */}
          <Popover open={videoOpen} onOpenChange={setVideoOpen}>
            <PopoverTrigger asChild>
              <Toggle size="sm" pressed={false} onPressedChange={() => setVideoOpen(v => !v)} title="Embed video">
                <Video className="h-4 w-4" />
              </Toggle>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-2">
                <Label>Video URL (YouTube or Vimeo)</Label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" onKeyDown={(e) => e.key === 'Enter' && insertVideo()} autoFocus />
                <p className="text-xs text-muted-foreground">Paste a YouTube or Vimeo URL to embed the video inline.</p>
                <Button size="sm" onClick={insertVideo} disabled={!videoUrl}>Embed</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
            <RemoveFormatting className="h-4 w-4" />
          </Button>
        </div>
      )}

      <EditorContent editor={editor} data-testid="editor-content" />
    </div>
  );
}
