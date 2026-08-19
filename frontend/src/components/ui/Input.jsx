import { motion } from 'framer-motion';
import { forwardRef, useState } from 'react';

const Input = forwardRef(({ 
  type = 'text',
  placeholder = '',
  className = '',
  error = false,
  icon: Icon,
  label,
  helperText,
  ...props 
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const baseStyles = 'w-full px-4 py-3 bg-white/[0.03] border rounded-xl text-white placeholder-neutral-400 transition-all duration-300 ease-out focus:outline-none';
  
  const borderStyles = error
    ? 'border-error-500/50 focus:border-error-500 focus:ring-2 focus:ring-error-500/20'
    : isFocused
    ? 'border-primary-500/50 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
    : 'border-white/8 hover:border-white/12';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <motion.input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={`${baseStyles} ${borderStyles} ${Icon ? 'pl-10' : ''} ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          animate={{
            borderColor: isFocused ? 'rgba(14, 165, 233, 0.5)' : 'rgba(255, 255, 255, 0.08)',
          }}
          transition={{ duration: 0.2 }}
          {...props}
        />
      </div>
      {helperText && (
        <p className={`text-xs ${error ? 'text-error-400' : 'text-neutral-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

const Select = forwardRef(({ 
  children,
  className = '',
  error = false,
  label,
  ...props 
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          {label}
        </label>
      )}
      <motion.select
        ref={ref}
        className={`w-full px-4 py-3 bg-white/[0.03] border rounded-xl text-white transition-all duration-300 ease-out focus:outline-none cursor-pointer appearance-none ${
          error
            ? 'border-error-500/50 focus:border-error-500 focus:ring-2 focus:ring-error-500/20'
            : 'border-white/8 hover:border-white/12 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20'
        } ${className}`}
        whileFocus={{ scale: 1.01 }}
        {...props}
      >
        {children}
      </motion.select>
    </div>
  );
});

export default Input;
export { Select };
