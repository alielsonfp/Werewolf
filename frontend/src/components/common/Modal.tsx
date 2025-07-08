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
// MODAL COMPONENT (VERSÃO FINAL CORRIGIDA E FUNCIONAL)
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
  const [mounted, setMounted] = useState(false);

  // Garante que o código só rode no cliente para o createPortal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Suporte para fechar com a tecla ESC
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

  // Bloqueio de scroll do body quando o modal está aberto
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

  // Render guard para SSR
  if (!mounted) return null;

  // Configurações de estilo
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'w-[95vw] h-[95vh]',
  };

  const variantStyles = {
    default: 'bg-medieval-800 border-medieval-600 text-white shadow-medieval',
    medieval: 'bg-gradient-to-b from-medieval-700 to-medieval-900 border-3 border-amber-600 text-white shadow-glow-gold relative overflow-hidden',
    game: 'bg-gradient-to-b from-night-light to-night-dark border-2 border-salem-500 text-white shadow-2xl backdrop-blur-sm',
    error: 'bg-gradient-to-b from-red-900 to-red-950 border-2 border-red-500 text-white shadow-glow-red',
  };

  // Configurações de animação
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } },
  };

  // Conteúdo do modal a ser renderizado no portal
  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        // O contêiner pai que cobre toda a tela e atua como o overlay clicável
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={closeOnOverlayClick ? onClose : undefined}
        >
          {/* Fundo escuro puramente visual, sem eventos de clique */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* O conteúdo do modal */}
          <motion.div
            className={clsx(
              'relative w-full max-h-[90vh] flex flex-col',
              'rounded-xl border-2',
              sizeClasses[size],
              variantStyles[variant],
              className
            )}
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()} // Impede que o clique no modal feche-o
          >
            {/* Cabeçalho (fixo) */}
            {title && (
              <header className="flex-shrink-0 flex items-center justify-between p-6 border-b border-current/20">
                <h2 className={clsx('text-xl font-bold', variant === 'medieval' && 'font-medieval text-2xl text-glow')}>
                  {title}
                </h2>
                <Button variant="ghost" size="sm" onClick={onClose} className="!p-1" aria-label="Fechar modal">
                  <X className="w-5 h-5" />
                </Button>
              </header>
            )}

            {/* Corpo do modal (área com rolagem) */}
            <main className="flex-1 overflow-y-auto p-6">
              {!title && (
                <Button variant="ghost" size="sm" onClick={onClose} className="!p-1 absolute top-4 right-4 z-10" aria-label="Fechar modal">
                  <X className="w-5 h-5" />
                </Button>
              )}
              {children}
            </main>

            {/* Decorações (apenas para o tema medieval) */}
            {variant === 'medieval' && (
              <>
                <div className="absolute top-2 left-2 w-8 h-8 border-l-3 border-t-3 border-amber-400 opacity-60 pointer-events-none" />
                <div className="absolute top-2 right-2 w-8 h-8 border-r-3 border-t-3 border-amber-400 opacity-60 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-l-3 border-b-3 border-amber-400 opacity-60 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-r-3 border-b-3 border-amber-400 opacity-60 pointer-events-none" />
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-12 h-6 bg-amber-600 rounded-full border-2 border-amber-400" />
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

// =============================================================================
// CONFIRMATION MODAL COMPONENT
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
    playSound('button_click');
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const getVariantProps = () => {
    switch (variant) {
      case 'danger':
        return { modalVariant: 'error' as const, confirmVariant: 'danger' as const };
      case 'warning':
        return { modalVariant: 'medieval' as const, confirmVariant: 'primary' as const };
      default:
        return { modalVariant: 'default' as const, confirmVariant: 'primary' as const };
    }
  };

  const { modalVariant, confirmVariant } = getVariantProps();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant={modalVariant} size="sm">
      <div className="space-y-6">
        <p className="text-white/90 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// ALERT MODAL COMPONENT
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
    playSound('button_click');
    onClose();
  };

  const getVariantProps = () => {
    switch (variant) {
      case 'success':
        return { modalVariant: 'game' as const, icon: '✅' };
      case 'error':
        return { modalVariant: 'error' as const, icon: '❌' };
      case 'warning':
        return { modalVariant: 'medieval' as const, icon: '⚠️' };
      default:
        return { modalVariant: 'default' as const, icon: 'ℹ️' };
    }
  };

  const { modalVariant, icon } = getVariantProps();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${icon} ${title}`} variant={modalVariant} size="sm">
      <div className="space-y-6">
        <p className="text-white/90 leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleClose}>
            Entendi
          </Button>
        </div>
      </div>
    </Modal>
  );
}