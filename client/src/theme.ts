import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const { darkAlgorithm } = theme;

/** Палитра премиум тёмной темы (совпадает с --premium-* в index.css) */
const premium = {
  bg: '#0b1220',
  surface: 'rgba(15, 23, 42, 0.92)',
  surfaceLight: 'rgba(30, 41, 59, 0.95)',
  border: 'rgba(148, 163, 184, 0.35)',
  borderLight: 'rgba(148, 163, 184, 0.15)',
  text: '#f8fafc',
  muted: '#94a3b8',
  accent: '#22d3ee',
  accentHover: 'rgba(34, 211, 238, 0.15)',
  primaryGradient: 'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
} as const;

export const appTheme: ThemeConfig = {
  algorithm: darkAlgorithm,
  token: {
    colorPrimary: premium.accent,
    colorPrimaryHover: '#38bdf8',
    colorPrimaryActive: '#06b6d4',
    colorBgBase: premium.bg,
    colorBgContainer: premium.surface,
    colorBgElevated: premium.surfaceLight,
    colorBgLayout: premium.bg,
    colorText: premium.text,
    colorTextSecondary: premium.muted,
    colorBorder: premium.border,
    colorBorderSecondary: premium.borderLight,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  components: {
    Card: {
      colorBgContainer: premium.surface,
      colorBorderSecondary: premium.border,
      colorText: premium.text,
      colorTextHeading: premium.text,
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: premium.surfaceLight,
      headerColor: premium.muted,
      colorBorderSecondary: premium.borderLight,
      colorFillAlter: 'rgba(30, 41, 59, 0.35)',
      rowHoverBg: premium.accentHover,
    },
    Layout: {
      headerBg: premium.surface,
      headerColor: premium.text,
      siderBg: premium.bg,
      bodyBg: 'transparent',
    },
    Input: {
      colorBgContainer: 'rgba(15, 23, 42, 0.8)',
      colorBorder: premium.border,
      colorText: premium.text,
      colorTextPlaceholder: premium.muted,
    },
    Select: {
      colorBgContainer: 'rgba(15, 23, 42, 0.8)',
      colorBorder: premium.border,
      colorText: premium.text,
      colorTextPlaceholder: premium.muted,
      selectorBg: 'rgba(15, 23, 42, 0.8)',
    },
    DatePicker: {
      colorBgContainer: 'rgba(15, 23, 42, 0.8)',
      colorBorder: premium.border,
      colorText: premium.text,
    },
    Button: {
      defaultBg: 'rgba(15, 23, 42, 0.8)',
      defaultBorderColor: premium.border,
      defaultColor: premium.text,
      defaultHoverBg: premium.accentHover,
      defaultHoverBorderColor: premium.accent,
      defaultHoverColor: premium.accent,
      primaryShadow: '0 8px 24px rgba(34, 211, 238, 0.35)',
    },
    Modal: {
      contentBg: premium.surface,
      headerBg: 'transparent',
      titleColor: premium.text,
      colorText: premium.muted,
      colorIcon: premium.muted,
      colorIconHover: premium.text,
    },
    Form: {
      labelColor: premium.muted,
    },
    Alert: {
      colorInfoBg: 'rgba(15, 23, 42, 0.9)',
      colorInfoBorder: premium.border,
    },
    List: {
      colorSplit: premium.border,
      colorText: premium.text,
    },
    Empty: {
      colorTextDescription: premium.muted,
    },
    Spin: {
      colorPrimary: premium.accent,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(34, 211, 238, 0.2)',
      darkItemHoverBg: 'rgba(148, 163, 184, 0.12)',
      darkItemSelectedColor: premium.text,
      darkItemColor: premium.muted,
      darkItemHoverColor: premium.text,
    },
  },
};
