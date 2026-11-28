import { parseMarkdownBlocks, type InlineSegment } from '../utils/markdown';

interface FormattedMessageProps {
  text: string;
  isUser: boolean;
}

function renderSegments(segments: InlineSegment[]) {
  return segments.map((segment, segIdx) => {
    if (segment.type === 'bold') {
      return (
        <strong key={segIdx} className="font-semibold text-slate-900">
          {segment.value}
        </strong>
      );
    }
    if (segment.type === 'italic') {
      return (
        <em key={segIdx} className="italic text-slate-700">
          {segment.value}
        </em>
      );
    }
    return <span key={segIdx}>{segment.value}</span>;
  });
}

export function FormattedMessage({ text, isUser }: FormattedMessageProps) {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="space-y-1.5">
      {blocks.map((block, idx) => {
        if (block.type === 'blank') {
          return <div key={idx} className="h-1" aria-hidden="true" />;
        }
        if (block.type === 'heading') {
          return (
            <p key={idx} className="font-semibold text-slate-900 pt-1">
              {renderSegments(block.segments)}
            </p>
          );
        }
        if (block.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-teal-700 mt-0.5 shrink-0" aria-hidden="true">
                •
              </span>
              <span>{renderSegments(block.segments)}</span>
            </div>
          );
        }
        return <p key={idx}>{renderSegments(block.segments)}</p>;
      })}
    </div>
  );
}
