export type ThemeName = 'default' | 'dracula' | 'nord' | 'one_dark' | 'solarized';

interface ThemeColors {
  bg: string; surface: string; surface2: string; surface3: string;
  border: string; borderLight: string;
  primary: string; primaryDim: string; accent: string; accentDim: string;
  success: string; successDim: string; warning: string; warningDim: string;
  error: string; errorDim: string;
  text: string; textMuted: string; textDim: string;
  nodeAI: string; nodeBrowser: string; nodeFile: string; nodeTask: string;
  nodeLogic: string; nodeData: string;
  running: string; completed: string; failed: string; pending: string;
  themeName: ThemeName; themeLabel: string;
}

export const THEMES: Record<ThemeName, ThemeColors> = {
  default: {
    bg: '#080B12', surface: '#0F1320', surface2: '#161B2E', surface3: '#1E2438',
    border: '#252C42', borderLight: '#2E3755',
    primary: '#4F8EF7', primaryDim: '#1A3D7A', accent: '#7C4DFF', accentDim: '#3D2080',
    success: '#00C896', successDim: '#003D2B', warning: '#FFB547', warningDim: '#4A3300',
    error: '#FF5252', errorDim: '#4A0F0F',
    text: '#E8EAF0', textMuted: '#8892A4', textDim: '#4E566A',
    nodeAI: '#7C4DFF', nodeBrowser: '#4F8EF7', nodeFile: '#00C896',
    nodeTask: '#FFB547', nodeLogic: '#FF7043', nodeData: '#26C6DA',
    running: '#4F8EF7', completed: '#00C896', failed: '#FF5252', pending: '#FFB547',
    themeName: 'default', themeLabel: 'CodeForge Dark',
  },
  dracula: {
    bg: '#1E1F29', surface: '#282A36', surface2: '#343746', surface3: '#3E4158',
    border: '#44475A', borderLight: '#565976',
    primary: '#BD93F9', primaryDim: '#3D2B6B', accent: '#FF79C6', accentDim: '#6B2047',
    success: '#50FA7B', successDim: '#0D4020', warning: '#F1FA8C', warningDim: '#4A4A10',
    error: '#FF5555', errorDim: '#4A1515',
    text: '#F8F8F2', textMuted: '#BFBFBF', textDim: '#6272A4',
    nodeAI: '#BD93F9', nodeBrowser: '#8BE9FD', nodeFile: '#50FA7B',
    nodeTask: '#FFB86C', nodeLogic: '#FF5555', nodeData: '#8BE9FD',
    running: '#8BE9FD', completed: '#50FA7B', failed: '#FF5555', pending: '#FFB86C',
    themeName: 'dracula', themeLabel: 'Dracula',
  },
  nord: {
    bg: '#2E3440', surface: '#3B4252', surface2: '#434C5E', surface3: '#4C566A',
    border: '#5A6478', borderLight: '#68748C',
    primary: '#88C0D0', primaryDim: '#1F4A54', accent: '#81A1C1', accentDim: '#1F3A4F',
    success: '#A3BE8C', successDim: '#2A3B24', warning: '#EBCB8B', warningDim: '#4A4020',
    error: '#BF616A', errorDim: '#3F1E22',
    text: '#ECEFF4', textMuted: '#D8DEE9', textDim: '#8896A8',
    nodeAI: '#B48EAD', nodeBrowser: '#88C0D0', nodeFile: '#A3BE8C',
    nodeTask: '#EBCB8B', nodeLogic: '#BF616A', nodeData: '#81A1C1',
    running: '#88C0D0', completed: '#A3BE8C', failed: '#BF616A', pending: '#EBCB8B',
    themeName: 'nord', themeLabel: 'Nord',
  },
  one_dark: {
    bg: '#1B1E27', surface: '#21252B', surface2: '#282C34', surface3: '#2F343D',
    border: '#3A3F4B', borderLight: '#4B5263',
    primary: '#61AFEF', primaryDim: '#1A3C5E', accent: '#C678DD', accentDim: '#4A2060',
    success: '#98C379', successDim: '#26361F', warning: '#E5C07B', warningDim: '#4A3A18',
    error: '#E06C75', errorDim: '#4A1E22',
    text: '#ABB2BF', textMuted: '#9DA5B4', textDim: '#5C6370',
    nodeAI: '#C678DD', nodeBrowser: '#61AFEF', nodeFile: '#98C379',
    nodeTask: '#E5C07B', nodeLogic: '#E06C75', nodeData: '#56B6C2',
    running: '#61AFEF', completed: '#98C379', failed: '#E06C75', pending: '#E5C07B',
    themeName: 'one_dark', themeLabel: 'One Dark Pro',
  },
  solarized: {
    bg: '#001B26', surface: '#002B36', surface2: '#073642', surface3: '#0D4050',
    border: '#144E5E', borderLight: '#1C6274',
    primary: '#268BD2', primaryDim: '#0A2E4A', accent: '#6C71C4', accentDim: '#262870',
    success: '#859900', successDim: '#2A3000', warning: '#B58900', warningDim: '#3A2C00',
    error: '#DC322F', errorDim: '#4A0E0D',
    text: '#93A1A1', textMuted: '#839496', textDim: '#485B5C',
    nodeAI: '#6C71C4', nodeBrowser: '#268BD2', nodeFile: '#859900',
    nodeTask: '#B58900', nodeLogic: '#DC322F', nodeData: '#2AA198',
    running: '#268BD2', completed: '#859900', failed: '#DC322F', pending: '#B58900',
    themeName: 'solarized', themeLabel: 'Solarized Dark',
  },
};

let _active: ThemeColors = THEMES.default;

export function setActiveTheme(name: ThemeName) { _active = THEMES[name]; }
export function getActiveTheme(): ThemeColors { return _active; }

// Live Colors proxy — always returns current theme value
export const Colors: ThemeColors = new Proxy({} as ThemeColors, {
  get(_t, key: string) { return (_active as any)[key]; },
});

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const FontSize = {
  xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, title: 28,
};

export const Radius = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 999,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  }),
};
