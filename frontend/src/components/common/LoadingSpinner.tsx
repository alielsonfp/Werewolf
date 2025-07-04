'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

// =============================================================================
// LOADING SPINNER COMPONENT
// =============================================================================
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'medieval' | 'werewolf' | 'dots';
  className?: string;
  text?: string;
}

function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className = '',
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  if (variant === 'medieval') {
    return <MedievalSpinner size={size} className={className} text={text} />;
  }

  if (variant === 'werewolf') {
    return <WerewolfSpinner size={size} className={className} text={text} />;
  }

  if (variant === 'dots') {
    return <DotsSpinner size={size} className={className} text={text} />;
  }

  // Default spinner
  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <motion.div
        className={clsx(
          sizeClasses[size],
          'border-3 border-salem-600 border-t-transparent rounded-full'
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      {text && (
        <p className="mt-3 text-white/70 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MEDIEVAL SPINNER
// =============================================================================
function MedievalSpinner({
  size,
  className,
  text
}: Pick<LoadingSpinnerProps, 'size' | 'className' | 'text'>) {
  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <motion.div
        className={clsx('text-amber-400', iconSizes[size!])}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: {
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        ⚔️
      </motion.div>
      {text && (
        <p className="mt-3 text-amber-300 font-medieval animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// WEREWOLF SPINNER
// =============================================================================
function WerewolfSpinner({
  size,
  className,
  text
}: Pick<LoadingSpinnerProps, 'size' | 'className' | 'text'>) {
  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <motion.div
        className={clsx('text-red-400', iconSizes[size!])}
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        🐺
      </motion.div>
      {text && (
        <p className="mt-3 text-red-300 font-bold animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// DOTS SPINNER
// =============================================================================
function DotsSpinner({
  size,
  className,
  text
}: Pick<LoadingSpinnerProps, 'size' | 'className' | 'text'>) {
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6',
  };

  const dotSpacing = {
    sm: 'space-x-1',
    md: 'space-x-2',
    lg: 'space-x-3',
    xl: 'space-x-4',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div className={clsx('flex', dotSpacing[size!])}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={clsx(
              dotSizes[size!],
              'bg-salem-400 rounded-full'
            )}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {text && (
        <p className="mt-3 text-white/70 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// FULLSCREEN LOADING
// =============================================================================
interface FullscreenLoadingProps {
  variant?: LoadingSpinnerProps['variant'];
  message?: string;
  submessage?: string;
}

export function FullscreenLoading({
  variant = 'medieval',
  message = 'Carregando...',
  submessage,
}: FullscreenLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-medieval-900/95 backdrop-blur-sm"
    >
      <div className="text-center">
        <LoadingSpinner
          variant={variant}
          size="xl"
          text={message}
        />
        {submessage && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-white/50 text-sm"
          >
            {submessage}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// PAGE LOADING
// =============================================================================
export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-medieval-900">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-8xl mb-8"
        >
          🐺
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-medieval text-glow mb-4"
        >
          Lobisomem Online
        </motion.h1>

        <LoadingSpinner
          variant="medieval"
          size="lg"
          text="Preparando a vila..."
        />
      </div>
    </div>
  );
}

// =============================================================================
// ✅ EXPORTS CORRETOS - ADICIONADOS NO FINAL
// =============================================================================
export default LoadingSpinner;