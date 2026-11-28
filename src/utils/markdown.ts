export interface InlineSegment {
  type: 'text' | 'bold' | 'italic';
  value: string;
}

export interface MarkdownBlock {
  type: 'blank' | 'heading' | 'bullet' | 'paragraph';
  segments: InlineSegment[];
}

export function parseInlineMarkdown(text: string): InlineSegment[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  const segments: InlineSegment[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      segments.push({ type: 'bold', value: part.slice(2, -2) });
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      segments.push({ type: 'italic', value: part.slice(1, -1) });
    } else {
      segments.push({ type: 'text', value: part });
    }
  }

  return segments;
}

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  return text.split('\n').map((rawLine): MarkdownBlock => {
    const line = rawLine.trim();
    if (!line) {
      return { type: 'blank', segments: [] };
    }

    if (/^#{1,3}\s+/.test(line)) {
      return {
        type: 'heading',
        segments: parseInlineMarkdown(line.replace(/^#{1,3}\s+/, '')),
      };
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return {
        type: 'bullet',
        segments: parseInlineMarkdown(line.slice(2)),
      };
    }

    return {
      type: 'paragraph',
      segments: parseInlineMarkdown(line),
    };
  });
}
