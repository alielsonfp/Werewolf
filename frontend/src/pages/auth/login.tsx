// 🐺 WEREWOLF - Login Page
// Werewolf inspired login interface

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useForm } from '@/hooks';
import { LoginRequest } from '@/types';
import Layout from '@/components/common/Layout';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// LOGIN PAGE COMPONENT
// =============================================================================
export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { playSound } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  // Form management
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleSubmit,
    setError,
    setTouched,
  } = useForm<LoginRequest>(
    {
      email: '',
      password: '',
    },
    async (formData) => {
      // Validate form
      if (!validateForm(formData)) return;

      try {
        const success = await login(formData);
        if (success) {
          const redirectTo = router.query.redirect as string || '/lobby';
          router.push(redirectTo);
        }
      } catch (error) {
        console.error('Login error:', error);
      }
    }
  );

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/lobby');
    }
  }, [isAuthenticated, isLoading, router]);

  // Form validation
  const validateForm = (data: LoginRequest): boolean => {
    let isValid = true;

    // Email validation
    if (!data.email) {
      setError('email', 'Email é obrigatório');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('email', 'Email inválido');
      isValid = false;
    }

    // Password validation
    if (!data.password) {
      setError('password', 'Senha é obrigatória');
      isValid = false;
    } else if (data.password.length < 6) {
      setError('password', 'Senha deve ter pelo menos 6 caracteres');
      isValid = false;
    }

    return isValid;
  };

  // Show loading if checking authentication
  if (isLoading) {
    return <LoadingSpinner variant="medieval" size="xl" text="Verificando autenticação..." />;
  }

  return (
    <>
      <Head>
        <title>Login - Werewolf</title>
        <meta name="description" content="Faça login na sua conta do Werewolf" />
      </Head>

      <Layout variant="auth">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-medieval p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-6xl mb-4"
            >
              🐺
            </motion.div>
            <h1 className="text-2xl font-medieval text-glow mb-2">
              Entrar na Vila
            </h1>
            <p className="text-white/70">
              Faça login para começar a jogar
            </p>
          </div>

          {/* Google Login Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              playSound('button_click');
              console.log('Google login clicked');
              // TODO: Implementar login com Google
            }}
            className="w-full border border-white/20 hover:border-white/40 mb-6"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-medieval-600"></div>
            <span className="px-4 text-white/50 text-sm">ou</span>
            <div className="flex-1 border-t border-medieval-600"></div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange('email')}
                  onBlur={() => setTouched('email')}
                  className={`
                    w-full pl-10 pr-4 py-3 bg-medieval-800/50 border rounded-lg
                    text-white placeholder-white/50 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-salem-400 focus:border-transparent
                    ${errors.email && touched.email
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-medieval-600 hover:border-salem-500'
                    }
                  `}
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && touched.email && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400"
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={handleChange('password')}
                  onBlur={() => setTouched('password')}
                  className={`
                    w-full pl-10 pr-12 py-3 bg-medieval-800/50 border rounded-lg
                    text-white placeholder-white/50 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-salem-400 focus:border-transparent
                    ${errors.password && touched.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-medieval-600 hover:border-salem-500'
                    }
                  `}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/70 transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && touched.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400"
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-salem-400 hover:text-salem-300 transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="medieval"
              size="lg"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="w-full"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Register Link */}
          <div className="text-center mt-8">
            <p className="text-white/70 mb-4">
              Ainda não tem uma conta?
            </p>
            <Button
              variant="ghost"
              onClick={() => router.push('/auth/register')}
              className="w-full"
              disabled={isSubmitting}
            >
              Criar Conta Gratuita
            </Button>
          </div>

          {/* Demo Credentials */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg"
            >
              <h4 className="text-sm font-semibold text-blue-300 mb-2">
                🧪 Modo Desenvolvimento
              </h4>
              <p className="text-xs text-blue-200/70 mb-2">
                Credenciais de teste:
              </p>
              <div className="text-xs font-mono text-blue-200">
                <div>Email: demo@werewolf.com</div>
                <div>Senha: demo123</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => {
                  handleChange('email')({ target: { value: 'demo@werewolf.com' } } as any);
                  handleChange('password')({ target: { value: 'demo123' } } as any);
                }}
              >
                Preencher Automaticamente
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-8xl opacity-5"
              style={{
                top: `${20 + i * 30}%`,
                left: `${10 + i * 30}%`,
              }}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6 + i * 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              🐺
            </motion.div>
          ))}
        </div>
      </Layout>
    </>
  );
}