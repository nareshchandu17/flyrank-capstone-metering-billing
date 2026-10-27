import { motion } from 'framer-motion';

const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Canvas base: crisp cool off-white */}
      <div className="absolute inset-0 bg-[#f6f9fc]" />

      {/* Atmospheric Upper Third Mesh Band */}
      <div className="absolute top-0 left-0 right-0 h-[460px] overflow-hidden">
        {/* Organic Multi-Stop Atmospheric Mesh */}
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 65% 55% at 5% 5%, rgba(245, 233, 212, 0.95) 0%, rgba(245, 233, 212, 0) 70%),
              radial-gradient(ellipse 55% 45% at 32% 10%, rgba(249, 115, 22, 0.18) 0%, rgba(249, 115, 22, 0) 65%),
              radial-gradient(ellipse 60% 50% at 68% 8%, rgba(185, 185, 249, 0.6) 0%, rgba(185, 185, 249, 0) 70%),
              radial-gradient(ellipse 48% 50% at 88% 18%, rgba(234, 34, 97, 0.16) 0%, rgba(234, 34, 97, 0) 65%),
              radial-gradient(ellipse 75% 45% at 50% -12%, rgba(83, 58, 253, 0.16) 0%, rgba(83, 58, 253, 0) 75%),
              linear-gradient(180deg, #ffffff 0%, rgba(246, 249, 252, 0.9) 70%, #f6f9fc 100%)
            `
          }}
        />

        {/* Ambient Floating Blobs for Living Atmospheric Depth */}
        <motion.div 
          className="absolute top-[-40px] left-[12%] w-[520px] h-[340px] rounded-full blur-[65px] opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(102, 94, 253, 0.45) 0%, rgba(185, 185, 249, 0.15) 50%, transparent 70%)'
          }}
          animate={{
            x: [0, 45, -30, 0],
            y: [0, 20, -15, 0],
            scale: [1, 1.08, 0.95, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div 
          className="absolute top-[-30px] right-[10%] w-[480px] h-[320px] rounded-full blur-[60px] opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(234, 34, 97, 0.3) 0%, rgba(249, 107, 238, 0.2) 50%, transparent 70%)'
          }}
          animate={{
            x: [0, -40, 25, 0],
            y: [0, 25, -20, 0],
            scale: [1, 0.96, 1.06, 1]
          }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div 
          className="absolute top-[20px] left-[42%] w-[420px] h-[260px] rounded-full blur-[55px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(245, 233, 212, 0.8) 0%, rgba(249, 115, 22, 0.2) 50%, transparent 70%)'
          }}
          animate={{
            x: [0, 30, -25, 0],
            y: [0, -18, 15, 0],
            scale: [1, 1.05, 0.98, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Soft feather gradient at the bottom transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#f6f9fc]" />
      </div>

      {/* Subtle micro-hairline grid in background */}
      <div 
        className="absolute inset-0 opacity-[0.035]" 
        style={{
          backgroundImage: 'linear-gradient(#0d253d 1px, transparent 1px), linear-gradient(90deg, #0d253d 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} 
      />
    </div>
  );
};

export default BackgroundAnimation;