import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInlineMarkdown, parseMarkdownBlocks } from './markdown';

test('parseInlineMarkdown splits bold, italic, and plain text cleanly', () => {
  const segments = parseInlineMarkdown('Run **HEPA** fan *continuously* overnight.');
  assert.deepEqual(segments, [
    { type: 'text', value: 'Run ' },
    { type: 'bold', value: 'HEPA' },
    { type: 'text', value: ' fan ' },
    { type: 'italic', value: 'continuously' },
    { type: 'text', value: ' overnight.' },
  ]);
});

test('parseMarkdownBlocks handles headings, bullets, blank lines, and keeps HTML literal', () => {
  const md = [
    '## Evening Air Steps',
    '',
    '- Cook on **back burners**',
    '* Keep windows *sealed*',
    '<script>alert(1)</script>',
  ].join('\n');

  const blocks = parseMarkdownBlocks(md);
  assert.equal(blocks.length, 5);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[0].segments[0].value, 'Evening Air Steps');
  assert.equal(blocks[1].type, 'blank');
  assert.equal(blocks[2].type, 'bullet');
  assert.equal(blocks[2].segments[1].type, 'bold');
  assert.equal(blocks[3].type, 'bullet');
  assert.equal(blocks[3].segments[1].type, 'italic');
  assert.equal(blocks[4].type, 'paragraph');
  assert.equal(blocks[4].segments[0].value, '<script>alert(1)</script>');
});
