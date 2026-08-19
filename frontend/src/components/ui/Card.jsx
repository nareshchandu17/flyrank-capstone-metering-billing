import { motion } from 'framer-motion';
import { forwardRef } from 'react';

const Card = forwardRef(({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  ...props 
}, ref) => {
  const variants = {
    default: 'bg-glass-premium backdrop-blur-xl border border-white/8 rounded-2xl',
    elevated: 'bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg-premium',
    subtle: 'bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-xl',
    gradient: 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl',
  };

  const hoverEffect = hover ? 'hover:border-white/12 hover:shadow-lg-premium transition-all duration-300' : '';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : {}}
      className={`${variants[variant]} ${hoverEffect} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 pt-6 pb-4 ${className}`}>
    {children}
  </div>
);

const CardBody = ({ children, className = '' }) => (
  <div className={`px-6 pb-6 ${className}`}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`px-6 pb-6 pt-4 border-t border-white/5 ${className}`}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
