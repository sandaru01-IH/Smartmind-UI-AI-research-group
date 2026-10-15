import { describe, expect, it } from 'vitest';
import { embedUrl } from './video';

describe('embedUrl', () => {
  it('handles the common YouTube shapes', () => {
    const want = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    expect(embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe(want);
    expect(embedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(want);
    expect(embedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(want);
    expect(embedUrl('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe(want);
  });
  it('handles Vimeo', () => {
    expect(embedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    );
  });
  it('refuses everything else', () => {
    expect(embedUrl('https://evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(embedUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(embedUrl('javascript:alert(1)')).toBeNull();
    expect(embedUrl('https://www.youtube.com/watch?v=<script>')).toBeNull();
    expect(embedUrl(null)).toBeNull();
  });
});
