import { act, renderHook } from '@testing-library/react';
import { navigate, parseRoute, useRoute } from './router';

describe('parseRoute', () => {
  it('maps / to the landing', () => {
    expect(parseRoute('/')).toEqual({ name: 'landing' });
  });

  it('maps /tui to the TUI with no pane', () => {
    expect(parseRoute('/tui')).toEqual({ name: 'tui', pane: null });
  });

  it('tolerates a trailing slash', () => {
    expect(parseRoute('/tui/')).toEqual({ name: 'tui', pane: null });
  });

  it('deep-links a pane', () => {
    expect(parseRoute('/tui/resume')).toEqual({ name: 'tui', pane: 'resume' });
  });

  it('reports unknown paths as notfound', () => {
    expect(parseRoute('/nope')).toEqual({ name: 'notfound' });
  });
});

describe('useRoute', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reflects the current location on mount', () => {
    window.history.replaceState(null, '', '/tui/projects');
    const { result } = renderHook(() => useRoute());
    expect(result.current).toEqual({ name: 'tui', pane: 'projects' });
  });

  it('updates when navigate() is called', () => {
    const { result } = renderHook(() => useRoute());
    act(() => navigate('/tui'));
    expect(result.current).toEqual({ name: 'tui', pane: null });
    expect(window.location.pathname).toBe('/tui');
  });

  it('updates on the back button (popstate)', () => {
    const { result } = renderHook(() => useRoute());
    act(() => navigate('/tui/resume'));
    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current).toEqual({ name: 'landing' });
  });
});
