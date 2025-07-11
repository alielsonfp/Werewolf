// 🐺 WEREWOLF - Login Page
// Werewolf inspired login interface with Magic Login

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, ArrowLeft, Home } from 'lucide-react';
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
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ NOVO: Gerar credenciais de dev uma única vez por renderização
  // Usamos useState para que o valor não mude a cada re-render do componente
  const [devCredentials] = useState(() => {
    if (process.env.NODE_ENV === 'development') {
      const randomId = Math.floor(Math.random() * 1000);
      const userTypes = ['player', 'admin', 'test', 'demo', 'dev'];
      const randomType = userTypes[Math.floor(Math.random() * userTypes.length)];

      return {
        email: `${randomType}_${randomId}@dev.test`,
        password: 'password123', // A senha pode ser fixa, pois será ignorada pelo backend
      };
    }
    return null;
  });

  // Form management
  const {
    values,
    errors,
    touched,
    handleChange,
    handleSubmit,
    setError: setFieldError,
    setTouched,
    setValue, // ✅ Adicionar setValue para preencher campos programaticamente
  } = useForm<LoginRequest>(
    {
      email: '',
      password: '',
    },
    async (formData) => {
      if (!validateForm(formData)) return;

      setIsSubmitting(true);
      setError('');

      try {
        await login(formData);
        // Se chegou aqui, o login foi bem-sucedido
        toast.success('Login realizado com sucesso!');
      } catch (loginError: any) {
        // Captura erros específicos do login
        const errorMessage = loginError?.message || 'Erro no login. Tente novamente.';
        setError(errorMessage);
        //toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    }
  );

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirectTo = router.query.redirect as string || '/lobby';
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router]);

  // Form validation
  const validateForm = (data: LoginRequest): boolean => {
    let isValid = true;
    setError('');

    // Email validation
    if (!data.email) {
      setFieldError('email', 'Email é obrigatório');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setFieldError('email', 'Email inválido');
      isValid = false;
    }

    // Password validation
    if (!data.password) {
      setFieldError('password', 'Senha é obrigatória');
      isValid = false;
    } else if (data.password.length < 6) {
      setFieldError('password', 'Senha deve ter pelo menos 6 caracteres');
      isValid = false;
    }

    return isValid;
  };

  // ✅ Função para preencher credenciais de desenvolvimento
  const fillDevCredentials = () => {
    if (devCredentials) {
      setValue('email', devCredentials.email);
      setValue('password', devCredentials.password);
      playSound('button_click');
      toast.success('Credenciais de desenvolvimento preenchidas!');
    }
  };

  // ✅ NOVA: Função para voltar à página inicial
  const handleBackToHome = () => {
    playSound('button_click');
    router.push('/');
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
        {/* ✅ NOVO: Botão de retorno elegante */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute top-6 left-6 z-10"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToHome}
            className="group flex items-center gap-2 px-3 py-2 bg-medieval-900/50 backdrop-blur-sm border border-medieval-600/50 hover:border-salem-500/50 hover:bg-medieval-800/50 transition-all duration-300"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="hidden sm:inline text-sm">Voltar ao Início</span>
            <Home className="w-4 h-4 sm:hidden" />
          </Button>
        </motion.div>

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

          {/* Display de erro geral */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </motion.div>
          )}

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

          {/* ✅✅✅ NOVO BLOCO DE DESENVOLVIMENTO COM CREDENCIAIS DINÂMICAS ✅✅✅ */}
          {devCredentials && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧪</span>
                <h4 className="text-sm font-semibold text-blue-300">
                  Modo Desenvolvimento - Magic Login
                </h4>
              </div>

              <p className="text-xs text-blue-200/70 mb-3">
                Credenciais de teste geradas automaticamente:
              </p>

              <div className="bg-black/20 rounded p-3 mb-3">
                <div className="text-xs font-mono text-blue-200">
                  <div className="flex justify-between items-center mb-1">
                    <span>Email:</span>
                    <span className="text-green-300">{devCredentials.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Senha:</span>
                    <span className="text-green-300">{devCredentials.password}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-blue-200/60 mb-3">
                ℹ️ Este email será aceito automaticamente pelo backend (bypassa validação de senha)
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs border border-blue-500/30 hover:border-blue-400/50"
                  onClick={fillDevCredentials}
                  disabled={isSubmitting}
                >
                  🚀 Preencher Automaticamente
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-300/70"
                  onClick={() => window.location.reload()}
                  disabled={isSubmitting}
                >
                  🔄 Gerar Novos
                </Button>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <div className="text-xs text-blue-200/50">
                  <strong>Como funciona:</strong> Emails terminados em <code className="bg-black/30 px-1 rounded">@dev.test</code> são automaticamente aceitos em desenvolvimento, criando usuários na hora se necessário.
                </div>
              </div>
            </motion.div>
          )}
          {/* ✅✅✅ FIM DO NOVO BLOCO DE DESENVOLVIMENTO ✅✅✅ */}
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