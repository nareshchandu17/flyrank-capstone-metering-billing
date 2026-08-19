import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const Button = forwardRef(({ 
  children, 
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow-sm hover:shadow-glow-md',
    secondary: 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/15',
    accent: 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-glow-sm hover:shadow-glow-accent',
    ghost: 'bg-transparent text-white hover:bg-white/5',
    danger: 'bg-gradient-to-r from-error-500 to-error-600 text-white hover:from-error-600 hover:to-error-700',
    success: 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-600 hover:to-success-700',
  };

  const sizes = {
    xs: 'px-3 py-1.5 text-xs font-medium rounded-lg',
    sm: 'px-4 py-2 text-sm font-medium rounded-lg',
    md: 'px-5 py-2.5 text-sm font-medium rounded-xl',
    lg: 'px-6 py-3 text-base font-medium rounded-xl',
    xl: 'px-8 py-4 text-base font-medium rounded-2xl',
  };

  const baseStyles = 'relative overflow-hidden font-medium transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">
        {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
        {children}
        {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
      </span>
      {/* Subtle shine effect on hover */}
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
    </motion.button>
  );
});

export default Button;
