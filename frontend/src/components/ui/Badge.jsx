import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const Badge = forwardRef(({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon,
  ...props 
}, ref) => {
  const variants = {
    default: 'bg-white/5 border border-white/10 text-white',
    primary: 'bg-primary-500/10 border border-primary-500/20 text-primary-400',
    accent: 'bg-accent-500/10 border border-accent-500/20 text-accent-400',
    success: 'bg-success-500/10 border border-success-500/20 text-success-400',
    warning: 'bg-warning-500/10 border border-warning-500/20 text-warning-400',
    error: 'bg-error-500/10 border border-error-500/20 text-error-400',
    neutral: 'bg-neutral-500/10 border border-neutral-500/20 text-neutral-400',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-xs font-medium rounded-md',
    sm: 'px-2.5 py-1 text-xs font-medium rounded-lg',
    md: 'px-3 py-1.5 text-sm font-medium rounded-lg',
    lg: 'px-4 py-2 text-sm font-medium rounded-xl',
  };

  return (
    <motion.span
      ref={ref}
      className={`inline-flex items-center gap-1.5 ${variants[variant]} ${sizes[size]} ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </motion.span>
  );
});

export default Badge;
