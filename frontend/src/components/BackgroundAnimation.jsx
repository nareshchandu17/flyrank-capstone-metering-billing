import { motion } from 'framer-motion';

const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[#000000]" />
      
      {/* Unique animated gradient mesh */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[60%] bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] rounded-full blur-[120px] animate-morph" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[120%] h-[60%] bg-gradient-to-bl from-[#f093fb] via-[#f5576c] to-[#4facfe] rounded-full blur-[120px] animate-morph animation-delay-4000" />
        <div className="absolute top-[30%] left-[30%] w-[60%] h-[40%] bg-gradient-to-r from-[#4facfe] via-[#00f2fe] to-[#43e97b] rounded-full blur-[100px] animate-morph animation-delay-2000" />
      </div>
      
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 400 400%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%221%22/%3E%3C/svg%3E")',
        backgroundSize: '200px 200px'
      }} />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />
      
      {/* Floating orbs */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#667eea] rounded-full blur-[60px]"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-[#f093fb] rounded-full blur-[80px]"
        animate={{
          x: [0, -80, 0],
          y: [0, -60, 0],
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute top-2/3 left-1/3 w-2 h-2 bg-[#4facfe] rounded-full blur-[50px]"
        animate={{
          x: [0, 60, 0],
          y: [0, 40, 0],
          scale: [1, 1.4, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export default BackgroundAnimation;