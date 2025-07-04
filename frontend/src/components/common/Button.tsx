'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import { ButtonProps } from '@/types';

// =============================================================================
// LOADING SPINNER COMPONENT (Inline para evitar dependências)
// =============================================================================
const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={clsx('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// =============================================================================
// BUTTON COMPONENT
// =============================================================================
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      onClick,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) {
    // Safe theme hook usage with fallback
    let playSound: (soundId: string) => void;
    try {
      const theme = useTheme();
      playSound = theme?.playSound || (() => { });
    } catch (error) {
      console.warn('Theme context not available, using fallback');
      playSound = () => { };
    }

    // =============================================================================
    // VARIANT STYLES
    // =============================================================================
    const variantStyles = {
      primary: clsx(
        'bg-gradient-to-b from-blue-500 to-blue-700',
        'hover:from-blue-400 hover:to-blue-600',
        'text-white font-bold shadow-lg',
        'border-2 border-blue-400',
        'hover:shadow-xl',
        'active:from-blue-700 active:to-blue-900'
      ),

      secondary: clsx(
        'bg-gradient-to-b from-gray-600 to-gray-800',
        'hover:from-gray-500 hover:to-gray-700',
        'text-white font-semibold shadow-lg',
        'border-2 border-gray-400',
        'hover:shadow-xl'
      ),

      danger: clsx(
        'bg-gradient-to-b from-red-500 to-red-700',
        'hover:from-red-400 hover:to-red-600',
        'text-white font-bold shadow-lg',
        'border-2 border-red-300',
        'hover:shadow-xl',
        'active:from-red-700 active:to-red-900'
      ),

      medieval: clsx(
        'bg-gradient-to-b from-amber-600 to-amber-800',
        'hover:from-amber-500 hover:to-amber-700',
        'text-white font-bold text-lg shadow-lg',
        'border-3 border-amber-400',
        'hover:shadow-xl',
        'relative overflow-hidden'
      ),

      ghost: clsx(
        'bg-transparent hover:bg-white/10',
        'text-white hover:text-blue-300',
        'border border-white/30 hover:border-blue-300',
        'transition-all duration-200'
      ),

      werewolf: clsx(
        'bg-gradient-to-b from-red-800 to-red-900',
        'hover:from-red-700 hover:to-red-800',
        'text-white font-bold shadow-lg',
        'border-2 border-red-600',
        'hover:shadow-xl'
      ),

      town: clsx(
        'bg-gradient-to-b from-green-600 to-green-800',
        'hover:from-green-500 hover:to-green-700',
        'text-white font-bold shadow-lg',
        'border-2 border-green-400',
        'hover:shadow-xl'
      ),
    };

    // =============================================================================
    // SIZE STYLES - CORREÇÃO: ADICIONADO GAP PARA ALINHAMENTO
    // =============================================================================
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
      md: 'px-4 py-2 text-base rounded-lg gap-2',
      lg: 'px-6 py-3 text-lg rounded-xl gap-2.5',
      xl: 'px-8 py-4 text-xl rounded-xl gap-3',
    };

    // =============================================================================
    // DISABLED/LOADING STYLES
    // =============================================================================
    const disabledStyles = clsx(
      'opacity-50 cursor-not-allowed',
      'hover:shadow-none hover:transform-none',
      'pointer-events-none'
    );

    // =============================================================================
    // COMBINED CLASSES
    // =============================================================================
    const buttonClasses = clsx(
      // Base styles
      'relative inline-flex items-center justify-center',
      'font-medium transition-all duration-200',
      'transform hover:scale-105 hover:-translate-y-0.5',
      'active:scale-95 active:translate-y-0',
      'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
      'select-none',

      // Variant styles
      variantStyles[variant],

      // Size styles
      sizeStyles[size],

      // State styles
      (disabled || loading) && disabledStyles,

      // Custom className
      className
    );

    // =============================================================================
    // CLICK HANDLER
    // =============================================================================
    const handleClick = () => {
      if (disabled || loading) return;

      // Play button click sound
      playSound('button_click');

      // Call onClick if provided
      onClick?.();
    };

    // =============================================================================
    // RENDER - CORREÇÃO: LAYOUT ALINHADO
    // =============================================================================
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        onClick={handleClick}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner - CORREÇÃO: SEM MARGIN MANUAL */}
        {loading && (
          <Spinner className="w-4 h-4" />
        )}

        {/* Button content - CORREÇÃO: SEM WRAPPER DESNECESSÁRIO */}
        {children}

        {/* Medieval button enhancement */}
        {variant === 'medieval' && (
          <>
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-60" />

            {/* Side highlights */}
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-amber-200 via-transparent to-amber-200 opacity-40" />
            <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-amber-200 via-transparent to-amber-200 opacity-40" />
          </>
        )}

        {/* Glow effect for primary variants */}
        {(variant === 'primary' || variant === 'medieval') && !disabled && !loading && (
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-amber-400 rounded-lg opacity-0 group-hover:opacity-20 blur transition-opacity duration-300 -z-10" />
        )}
      </button>
    );
  }
);

// =============================================================================
// DISPLAY NAME (CRÍTICO para forwardRef)
// =============================================================================
Button.displayName = 'Button';

// =============================================================================
// BUTTON GROUP COMPONENT
// =============================================================================
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  function ButtonGroup(
    {
      children,
      className = '',
      orientation = 'horizontal'
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={clsx(
          'inline-flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          '[&>button]:rounded-none',
          '[&>button:first-child]:rounded-l-lg',
          '[&>button:last-child]:rounded-r-lg',
          orientation === 'vertical' && '[&>button:first-child]:rounded-t-lg [&>button:first-child]:rounded-l-none',
          orientation === 'vertical' && '[&>button:last-child]:rounded-b-lg [&>button:last-child]:rounded-r-none',
          '[&>button:not(:first-child)]:border-l-0',
          orientation === 'vertical' && '[&>button:not(:first-child)]:border-l [&>button:not(:first-child)]:border-t-0',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

// =============================================================================
// ICON BUTTON COMPONENT
// =============================================================================
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      className = '',
      size = 'md',
      ...props
    },
    ref
  ) {
    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
    };

    return (
      <Button
        ref={ref}
        className={clsx('!p-2 aspect-square', className)}
        size={size}
        {...props}
      >
        <span className={iconSizes[size]}>{icon}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// =============================================================================
// DEFAULT EXPORT
// =============================================================================
export default Button;