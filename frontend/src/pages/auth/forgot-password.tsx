// 🐺 WEREWOLF - Forgot Password Page
// Werewolf inspired password recovery interface

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';

import { useForm } from '@/hooks';
import { authService } from '@/services/auth';
import Layout from '@/components/common/Layout';
import Button from '@/components/common/Button';

// =============================================================================
// FORGOT PASSWORD PAGE COMPONENT
// =============================================================================
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);

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
  } = useForm<{ email: string }>(
    { email: '' },
    async (formData) => {
      // Validate email
      if (!formData.email) {
        setError('email', 'Email é obrigatório');
        return;
      }

      if (!authService.validateEmail(formData.email)) {
        setError('email', 'Email inválido');
        return;
      }

      try {
        const response = await authService.forgotPassword(formData.email);
        if (response.success) {
          setEmailSent(true);
        } else {
          setError('email', response.error || 'Erro ao enviar email');
        }
      } catch (error) {
        setError('email', 'Erro de conexão. Tente novamente.');
      }
    }
  );

  if (emailSent) {
    return <EmailSentSuccess email={values.email} />;
  }

  return (
    <>
      <Head>
        <title>Esqueci Minha Senha - Werewolf</title>
        <meta name="description" content="Recupere sua senha do Werewolf" />
      </Head>

      <Layout variant="auth">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-medieval p-8"
        >
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </motion.div>

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-6xl mb-4"
            >
              🔑
            </motion.div>
            <h1 className="text-2xl font-medieval text-glow mb-2">
              Esqueceu sua Senha?
            </h1>
            <p className="text-white/70 leading-relaxed">
              Não se preocupe! Digite seu email e enviaremos
              instruções para redefinir sua senha.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                Email da Conta
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
                  autoFocus
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

            {/* Submit Button */}
            <Button
              type="submit"
              variant="medieval"
              size="lg"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="w-full"
            >
              <Send className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Enviando...' : 'Enviar Instruções'}
            </Button>
          </form>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg"
          >
            <h3 className="text-sm font-semibold text-blue-300 mb-2">
              💡 Dica
            </h3>
            <p className="text-xs text-blue-200/70">
              Verifique sua caixa de spam se não receber o email em alguns minutos.
              O email de recuperação será enviado de noreply@werewolf.com
            </p>
          </motion.div>

          {/* Back to Login */}
          <div className="mt-8 text-center">
            <p className="text-white/50 text-sm mb-4">
              Lembrou da sua senha?
            </p>
            <Link
              href="/auth/login"
              className="text-salem-400 hover:text-salem-300 transition-colors text-sm font-medium"
            >
              Voltar para o Login
            </Link>
          </div>
        </motion.div>
      </Layout>
    </>
  );
}

// =============================================================================
// EMAIL SENT SUCCESS COMPONENT
// =============================================================================
interface EmailSentSuccessProps {
  email: string;
}

function EmailSentSuccess({ email }: EmailSentSuccessProps) {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Email Enviado - Werewolf</title>
      </Head>

      <Layout variant="auth">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-medieval p-8 text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.6 }}
            className="text-6xl mb-6"
          >
            📧
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
              <h1 className="text-2xl font-medieval text-glow">
                Email Enviado!
              </h1>
            </div>

            <p className="text-white/70 leading-relaxed mb-4">
              Enviamos instruções de recuperação de senha para:
            </p>

            <div className="bg-medieval-800/50 border border-medieval-600 rounded-lg p-3 mb-6">
              <span className="font-mono text-salem-300">{email}</span>
            </div>

            <p className="text-white/60 text-sm">
              Siga as instruções no email para redefinir sua senha.
              O link é válido por 1 hora.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <Button
              variant="medieval"
              size="lg"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Voltar ao Login
            </Button>

            <Button
              variant="ghost"
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full text-sm"
            >
              Não recebeu o email? Tentar novamente
            </Button>
          </motion.div>

          {/* Additional Help */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg"
          >
            <h3 className="text-sm font-semibold text-amber-300 mb-2">
              ⚠️ Não recebeu o email?
            </h3>
            <ul className="text-xs text-amber-200/70 text-left space-y-1">
              <li>• Verifique sua caixa de spam</li>
              <li>• Confirme se o email está correto</li>
              <li>• Aguarde alguns minutos</li>
              <li>• Tente novamente se necessário</li>
            </ul>
          </motion.div>
        </motion.div>
      </Layout>
    </>
  );
}