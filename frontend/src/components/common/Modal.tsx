'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import { ModalProps } from '@/types';
import Button from './Button';

// =============================================================================
// MODAL COMPONENT
// =============================================================================
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  closeOnOverlayClick = true,
  size = 'md',
  variant = 'default',
}: ModalProps & {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'medieval' | 'game' | 'error';
}) {
  const { playSound } = useTheme();
  const [mounted, setMounted] = useState(false);

  // =============================================================================
  // MOUNT STATE
  // =============================================================================
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // =============================================================================
  // SOUND EFFECTS - SEM SONS DE MODAL (arquivos não existem)
  // =============================================================================
  // Removido: useEffect para sons de modal que não existem

  // =============================================================================
  // KEYBOARD HANDLING
  // =============================================================================
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // =============================================================================
  // BODY SCROLL LOCK
  // =============================================================================
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // =============================================================================
  // SIZE VARIANTS
  // =============================================================================
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  };

  // =============================================================================
  // VARIANT STYLES
  // =============================================================================
  const variantStyles = {
    default: clsx(
      'bg-medieval-800 border-medieval-600',
      'text-white shadow-medieval'
    ),

    medieval: clsx(
      'bg-gradient-to-b from-medieval-700 to-medieval-900',
      'border-3 border-amber-600',
      'text-white shadow-glow-gold',
      'relative overflow-hidden',
      'before:absolute before:inset-0 before:bg-medieval-paper before:opacity-10',
      'before:bg-cover before:bg-center'
    ),

    game: clsx(
      'bg-gradient-to-b from-night-light to-night-dark',
      'border-2 border-salem-500',
      'text-white shadow-2xl',
      'backdrop-blur-sm'
    ),

    error: clsx(
      'bg-gradient-to-b from-red-900 to-red-950',
      'border-2 border-red-500',
      'text-white shadow-glow-red'
    ),
  };

  // =============================================================================
  // ANIMATION VARIANTS
  // =============================================================================
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  // =============================================================================
  // CLOSE HANDLER SEM SOM
  // =============================================================================
  const handleClose = () => {
    // Removido som de modal que não existe
    onClose();
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={closeOnOverlayClick ? handleClose : undefined}
          />

          {/* Modal */}
          <motion.div
            className={clsx(
              'relative w-full',
              sizeClasses[size],
              'max-h-[90vh] overflow-hidden',
              'rounded-xl border-2',
              variantStyles[variant],
              className
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-current/20">
                <h2 className={clsx(
                  'text-xl font-bold',
                  variant === 'medieval' && 'font-medieval text-2xl text-glow'
                )}>
                  {title}
                </h2>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="!p-1 hover:bg-white/10 text-white/70 hover:text-white"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className={clsx(
              'p-6',
              size === 'full' && 'overflow-auto',
              !title && 'relative'
            )}>
              {/* Close button when no title */}
              {!title && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="absolute top-4 right-4 !p-1 hover:bg-white/10 text-white/70 hover:text-white z-10"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}

              {children}
            </div>

            {/* Medieval decorations */}
            {variant === 'medieval' && (
              <>
                {/* Corner decorations */}
                <div className="absolute top-2 left-2 w-8 h-8 border-l-3 border-t-3 border-amber-400 opacity-60" />
                <div className="absolute top-2 right-2 w-8 h-8 border-r-3 border-t-3 border-amber-400 opacity-60" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-l-3 border-b-3 border-amber-400 opacity-60" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-r-3 border-b-3 border-amber-400 opacity-60" />

                {/* Top decoration */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-12 h-6 bg-amber-600 rounded-full border-2 border-amber-400" />
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

// =============================================================================
// CONFIRMATION MODAL
// =============================================================================
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
}: ConfirmModalProps) {
  const { playSound } = useTheme();

  const handleConfirm = () => {
    playSound('button_click'); // Este som existe
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    playSound('button_secondary'); // Este som existe
    onClose();
  };

  const getVariantProps = () => {
    switch (variant) {
      case 'danger':
        return {
          modalVariant: 'error' as const,
          confirmVariant: 'danger' as const,
        };
      case 'warning':
        return {
          modalVariant: 'medieval' as const,
          confirmVariant: 'primary' as const,
        };
      default:
        return {
          modalVariant: 'default' as const,
          confirmVariant: 'primary' as const,
        };
    }
  };

  const { modalVariant, confirmVariant } = getVariantProps();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={modalVariant}
      size="sm"
    >
      <div className="space-y-6">
        <p className="text-white/90 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={handleCancel}
          >
            {cancelText}
          </Button>

          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// ALERT MODAL
// =============================================================================
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
}: AlertModalProps) {
  const { playSound } = useTheme();

  const handleClose = () => {
    playSound('button_click'); // Este som existe
    onClose();
  };

  const getVariantProps = () => {
    switch (variant) {
      case 'success':
        return {
          modalVariant: 'game' as const,
          icon: '✅',
        };
      case 'error':
        return {
          modalVariant: 'error' as const,
          icon: '❌',
        };
      case 'warning':
        return {
          modalVariant: 'medieval' as const,
          icon: '⚠️',
        };
      default:
        return {
          modalVariant: 'default' as const,
          icon: 'ℹ️',
        };
    }
  };

  const { modalVariant, icon } = getVariantProps();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${icon} ${title}`}
      variant={modalVariant}
      size="sm"
    >
      <div className="space-y-6">
        <p className="text-white/90 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleClose}
          >
            Entendi
          </Button>
        </div>
      </div>
    </Modal>
  );
}