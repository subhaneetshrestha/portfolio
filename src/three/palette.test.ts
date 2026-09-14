import { readPalette } from './palette';

const set = (name: string, value: string) => document.documentElement.style.setProperty(name, value);

describe('readPalette', () => {
  it('reads each token from the given element’s computed style', () => {
    set('--bg', '#0B0D10');
    set('--fg', '#C9D1D9');
    set('--primary', '#00ADD8');
    set('--accent', '#FFB454');
    set('--secondary', '#1793D1');
    expect(readPalette()).toEqual({
      bg: '#0B0D10', fg: '#C9D1D9', primary: '#00ADD8', accent: '#FFB454', secondary: '#1793D1',
    });
  });

  it('reads from a specific element, not always the document root', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.style.setProperty('--primary', '#123456');
    expect(readPalette(el).primary).toBe('#123456');
    el.remove();
  });
});
