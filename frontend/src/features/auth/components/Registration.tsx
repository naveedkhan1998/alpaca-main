import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import {
  useRegisterUserMutation,
  useGoogleLoginMutation,
  useGetLoggedUserQuery,
} from '@/api/userAuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Mail,
  Lock,
  User,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppDispatch } from 'src/app/hooks';
import { setCredentials } from '../authSlice';
import { setToken } from '@/api/auth';
import { AuthResponse } from '@/types/common-types';
import { handleFormError, handleAuthError } from '@/utils/errorHandler';

export default function Registration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPassword2, setRegisterPassword2] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [register, { isLoading: isRegisterLoading }] =
    useRegisterUserMutation();
  const [googleLogin, { isLoading: isGoogleLoginLoading }] =
    useGoogleLoginMutation();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setSuccessMessage('');

    if (registerPassword !== registerPassword2) {
      setRegisterError("Passwords don't match.");
      return;
    }

    if (!acceptTerms) {
      setRegisterError('You must accept the terms and conditions.');
      return;
    }

    try {
      const userData = await register({
        email: registerEmail,
        name: registerName,
        password: registerPassword,
        password2: registerPassword2,
        tc: acceptTerms,
      }).unwrap();

      handleAuthSuccess(userData);
      setSuccessMessage('Registration successful!');
    } catch (error: unknown) {
      setRegisterError(handleFormError(error));
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      setRegisterError('');
      setSuccessMessage('');

      try {
        const userData = await googleLogin({
          token: response.credential,
        }).unwrap();
        handleAuthSuccess(userData);
        setSuccessMessage('Google registration successful!');
      } catch (error: unknown) {
        setRegisterError(handleAuthError(error));
      }
    } else {
      setRegisterError('No credential received from Google.');
    }
  };

  const handleGoogleFailure = () => {
    console.error('Google registration failed');
    setRegisterError(
      'Google registration failed. Please try again or use email/password registration.'
    );
  };

  const { refetch: getLoggedUser } = useGetLoggedUserQuery();

  const handleAuthSuccess = async (userData: AuthResponse) => {
    setToken(userData.token.access);

    // Fetch logged in user data
    const { data: user } = await getLoggedUser();

    // Update Redux state with access token and user data
    dispatch(
      setCredentials({
        access: userData.token.access,
        user: user,
      })
    );

    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="space-y-3 text-center">
        <motion.h2
          className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Create Your Account
        </motion.h2>
        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Join thousands of traders and start your journey today
        </motion.p>
      </div>

      <form onSubmit={handleRegisterSubmit} className="space-y-5">
        {registerError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Alert
              variant="destructive"
              className="border-destructive/50 bg-destructive/5"
            >
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="font-medium">
                {registerError}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Alert className="border-success/50 bg-success/5 text-success">
              <Check className="w-4 h-4" />
              <AlertDescription className="font-medium">
                {successMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="space-y-2">
          <Label htmlFor="registerName" className="text-sm font-medium">
            Full Name
          </Label>
          <div className="relative group">
            <User className="absolute w-4 h-4 left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="registerName"
              placeholder="John Doe"
              value={registerName}
              onChange={e => setRegisterName(e.target.value)}
              required
              className="pl-10 h-11 transition-all border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerEmail" className="text-sm font-medium">
            Email Address
          </Label>
          <div className="relative group">
            <Mail className="absolute w-4 h-4 left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="registerEmail"
              type="email"
              placeholder="you@example.com"
              value={registerEmail}
              onChange={e => setRegisterEmail(e.target.value)}
              required
              className="pl-10 h-11 transition-all border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerPassword" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative group">
            <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="registerPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Choose a strong password"
              value={registerPassword}
              onChange={e => setRegisterPassword(e.target.value)}
              required
              className="pl-10 pr-10 h-11 transition-all border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            At least 8 characters recommended
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerPassword2" className="text-sm font-medium">
            Confirm Password
          </Label>
          <div className="relative group">
            <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="registerPassword2"
              type={showPassword2 ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={registerPassword2}
              onChange={e => setRegisterPassword2(e.target.value)}
              required
              className="pl-10 pr-10 h-11 transition-all border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword2(!showPassword2)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword2 ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30 border border-border/50">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={checked => setAcceptTerms(checked as boolean)}
            required
            className="mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
          >
            I agree to the{' '}
            <a
              href="/terms"
              className="text-primary hover:underline font-medium"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="text-primary hover:underline font-medium"
            >
              Privacy Policy
            </a>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 text-base font-medium"
          disabled={isRegisterLoading}
        >
          {isRegisterLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating your account...
            </>
          ) : (
            <>
              Create Account
              <motion.span
                className="ml-2"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </>
          )}
        </Button>
      </form>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-3 py-1 rounded-full bg-background text-muted-foreground font-medium">
            Or continue with
          </span>
        </div>
      </div>

      <div className="w-full">
        {isGoogleLoginLoading ? (
          <div className="flex items-center justify-center p-4 rounded-lg border border-border/50 bg-muted/50">
            <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
            <span className="text-sm font-medium">Connecting to Google...</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleFailure}
              useOneTap
              type="standard"
              theme="filled_black"
              size="large"
              shape="rectangular"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
