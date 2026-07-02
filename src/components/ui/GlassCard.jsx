import React from 'react';

const VARIANT_CLASS = {
  default: 'glass-panel shadow-glass dark:shadow-glass-dark',
  strong: 'glass-panel-strong shadow-glass dark:shadow-glass-dark',
  subtle: 'glass-subtle',
};

const GlassCard = ({ variant = 'default', className = '', children, ...rest }) => (
  <div className={`rounded-2xl ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.default} ${className}`} {...rest}>
    {children}
  </div>
);

export default GlassCard;
