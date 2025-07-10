// 🐺 WEREWOLF - Register Page
// Werewolf inspired registration interface

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Check, X } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useForm, useDebounce } from '@/hooks';
import { RegisterRequest } from '@/types';
import { authService } from '@/services/auth';
import Layout from '@/components/common/Layout';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// =============================================================================
// REGISTER PAGE COMPONENT
// =============================================================================
export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form management
  const {
    values,
    errors,
    touched,
    handleChange,
    handleSubmit,
    setError,
    setTouched,
  } = useForm<RegisterRequest>(
    {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
    async (formData) => {
      if (!validateForm(formData)) return;

      setIsSubmitting(true);
      await register(formData);
      setIsSubmitting(false);
    }
  );

  // Debounced values for availability checking
  const debouncedUsername = useDebounce(values.username, 500);
  const debouncedEmail = useDebounce(values.email, 500);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/lobby');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check username availability
  useEffect(() => {
    if (debouncedUsername && debouncedUsername.length >= 3) {
      checkUsernameAvailability(debouncedUsername);
    } else {
      setUsernameAvailable(null);
    }
  }, [debouncedUsername]);

  // Check email availability
  useEffect(() => {
    if (debouncedEmail && authService.validateEmail(debouncedEmail)) {
      checkEmailAvailability(debouncedEmail);
    } else {
      setEmailAvailable(null);
    }
  }, [debouncedEmail]);

  // Username availability check
  const checkUsernameAvailability = async (username: string) => {
    setCheckingUsername(true);
    try {
      const response = await authService.checkUsernameAvailability(username);
      setUsernameAvailable(response.data?.available || false);
    } catch (error) {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Email availability check
  const checkEmailAvailability = async (email: string) => {
    setCheckingEmail(true);
    try {
      const response = await authService.checkEmailAvailability(email);
      setEmailAvailable(response.data?.available || false);
    } catch (error) {
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Form validation
  const validateForm = (data: RegisterRequest): boolean => {
    let isValid = true;

    // Email validation
    if (!data.email) {
      setError('email', 'Email é obrigatório');
      isValid = false;
    } else if (!authService.validateEmail(data.email)) {
      setError('email', 'Email inválido');
      isValid = false;
    } else if (emailAvailable === false) {
      setError('email', 'Este email já está em uso');
      isValid = false;
    }

    // Username validation
    const usernameValidation = authService.validateUsername(data.username);
    if (!usernameValidation.isValid) {
      setError('username', usernameValidation.errors[0] || 'Erro de validação');
      isValid = false;
    } else if (usernameAvailable === false) {
      setError('username', 'Este username já está em uso');
      isValid = false;
    }

    // Password validation
    const passwordValidation = authService.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      setError('password', passwordValidation.errors[0] || 'Erro de validação');
      isValid = false;
    }

    // Confirm password validation
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', 'Senhas não coincidem');
      isValid = false;
    }

    return isValid;
  };

  // Get field status icon
  const getFieldStatusIcon = (field: 'username' | 'email') => {
    const isChecking = field === 'username' ? checkingUsername : checkingEmail;
    const isAvailable = field === 'username' ? usernameAvailable : emailAvailable;
    const value = field === 'username' ? values.username : values.email;

    if (!value || (field === 'username' && value.length < 3)) return null;
    if (isChecking) return <LoadingSpinner size="sm" />;
    if (isAvailable === true) return <Check className="w-5 h-5 text-green-400" />;
    if (isAvailable === false) return <X className="w-5 h-5 text-red-400" />;
    return null;
  };

  // Show loading if checking authentication
  if (isLoading) {
    return <LoadingSpinner variant="medieval" size="xl" text="Verificando autenticação..." />;
  }

  return (
    <>
      <Head>
        <title>Criar Conta - Werewolf</title>
        <meta name="description" content="Crie sua conta no Werewolf e entre na vila" />
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
              🏘️
            </motion.div>
            <h1 className="text-2xl font-medieval text-glow mb-2">
              Juntar-se à Vila
            </h1>
            <p className="text-white/70">
              Crie sua conta para começar a jogar
            </p>
          </div>

          {/* Google Register Button */}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              console.log('Google register clicked');
              // TODO: Implementar registro com Google
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
            Criar conta com Google
          </Button>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-medieval-600"></div>
            <span className="px-4 text-white/50 text-sm">ou</span>
            <div className="flex-1 border-t border-medieval-600"></div>
          </div>

          {/* Register Form */}
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
                    w-full pl-10 pr-12 py-3 bg-medieval-800/50 border rounded-lg
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
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {getFieldStatusIcon('email')}
                </div>
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

            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                Nome de Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={values.username}
                  onChange={handleChange('username')}
                  onBlur={() => setTouched('username')}
                  className={`
                    w-full pl-10 pr-12 py-3 bg-medieval-800/50 border rounded-lg
                    text-white placeholder-white/50 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-salem-400 focus:border-transparent
                    ${errors.username && touched.username
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-medieval-600 hover:border-salem-500'
                    }
                  `}
                  placeholder="seunome123"
                  disabled={isSubmitting}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {getFieldStatusIcon('username')}
                </div>
              </div>
              <p className="mt-1 text-xs text-white/50">
                3-20 caracteres, apenas letras, números, _ e -
              </p>
              {errors.username && touched.username && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400"
                >
                  {errors.username}
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

              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                <PasswordRequirement
                  met={values.password.length >= 6}
                  text="Pelo menos 6 caracteres"
                />
                <PasswordRequirement
                  met={/(?=.*[a-z])/.test(values.password)}
                  text="Uma letra minúscula"
                />
                <PasswordRequirement
                  met={/(?=.*[A-Z])/.test(values.password)}
                  text="Uma letra maiúscula"
                />
                <PasswordRequirement
                  met={/(?=.*\d)/.test(values.password)}
                  text="Um número"
                />
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

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                Confirmar Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={values.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  onBlur={() => setTouched('confirmPassword')}
                  className={`
                    w-full pl-10 pr-12 py-3 bg-medieval-800/50 border rounded-lg
                    text-white placeholder-white/50 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-salem-400 focus:border-transparent
                    ${errors.confirmPassword && touched.confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-medieval-600 hover:border-salem-500'
                    }
                  `}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/70 transition-colors"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && touched.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400"
                >
                  {errors.confirmPassword}
                </motion.p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="medieval"
              size="lg"
              disabled={isSubmitting || usernameAvailable === false || emailAvailable === false}
              loading={isSubmitting}
              className="w-full"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-8">
            <p className="text-white/70 mb-4">
              Já tem uma conta?
            </p>
            <Button
              variant="ghost"
              onClick={() => router.push('/auth/login')}
              className="w-full"
              disabled={isSubmitting}
            >
              Fazer Login
            </Button>
          </div>
        </motion.div>
      </Layout>
    </>
  );
}

// =============================================================================
// PASSWORD REQUIREMENT COMPONENT
// =============================================================================
interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

function PasswordRequirement({ met, text }: PasswordRequirementProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center text-xs"
    >
      {met ? (
        <Check className="w-3 h-3 text-green-400 mr-2" />
      ) : (
        <X className="w-3 h-3 text-red-400 mr-2" />
      )}
      <span className={met ? 'text-green-400' : 'text-red-400'}>
        {text}
      </span>
    </motion.div>
  );
}