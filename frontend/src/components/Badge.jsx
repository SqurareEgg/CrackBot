import React from 'react';

const variantStyles = {
  teal: { background: '#E1F5EE', color: '#0F6E56' },
  amber: { background: '#FAEEDA', color: '#854F0B' },
  red: { background: '#FCEBEB', color: '#A32D2D' },
  blue: { background: '#E6F1FB', color: '#185FA5' },
  gray: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
};

export default function Badge({ variant = 'gray', children, style = {} }) {
  const vs = variantStyles[variant] || variantStyles.gray;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        ...vs,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
