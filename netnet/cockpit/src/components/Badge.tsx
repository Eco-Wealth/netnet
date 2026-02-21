import React from 'react';
import { colors, spacing } from '../styles/design-tokens';

export type BadgeProps = {
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'info';
};

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'default' }) => {
  const bg = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : tone === 'info' ? colors.info : colors.muted;
  return (
    <span style={{
      display: 'inline-block',
      padding: `${spacing.xs} ${spacing.sm}`,
      backgroundColor: bg,
      color: '#fff',
      borderRadius: '9999px',
      fontSize: '12px'
    }}>{children}</span>
  );
};

export default Badge;
