import { readPalette } from './palette';

const set = (name: string, value: string) => document.documentElement.style.setProperty(name, value);

describe('readPalette', () => {
  it('reads each brand token from the given element’s computed style', () => {
    set('--bg', '#0B0D10');
    set('--fg', '#C9D1D9');
    set('--primary', '#00ADD8');
    set('--accent', '#FFB454');
    set('--secondary', '#1793D1');
    const p = readPalette();
    expect(p.bg).toBe('#0B0D10');
    expect(p.fg).toBe('#C9D1D9');
    expect(p.primary).toBe('#00ADD8');
    expect(p.accent).toBe('#FFB454');
    expect(p.secondary).toBe('#1793D1');
  });

  it('reads the scene-only tokens too — sampled from the reference, not the brand palette', () => {
    set('--scene-wall', '#F4F0E3');
    set('--scene-wood', '#E8A85E');
    set('--scene-rug', '#E15B08');
    set('--scene-glow', '#E405A3');
    const p = readPalette();
    expect(p.wall).toBe('#F4F0E3');
    expect(p.wood).toBe('#E8A85E');
    expect(p.rug).toBe('#E15B08');
    expect(p.glow).toBe('#E405A3');
  });

  it('reads from a specific element, not always the document root', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.style.setProperty('--primary', '#123456');
    expect(readPalette(el).primary).toBe('#123456');
    el.remove();
  });
});
