import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import {
  useLoginUserMutation,
  useGoogleLoginMutation,
  useGetLoggedUserQuery,
} from '@/api/userAuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Mail,
  Lock,
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
import { handleAuthError } from '@/utils/errorHandler';

interface FormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [loginUser, { isLoading: isLoginLoading }] = useLoginUserMutation();
  const [googleLogin, { isLoading: isGoogleLoginLoading }] =
    useGoogleLoginMutation();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prevData => ({ ...prevData, [id]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    if (!formData.email || !formData.password) {
      setError('Please fill in both fields.');
      return;
    }

    try {
      const userData = await loginUser(formData).unwrap();
      handleAuthSuccess(userData);
      setSuccessMessage('Login successful!');
    } catch (error) {
      setError(handleAuthError(error));
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      setError('');
      setSuccessMessage('');

      try {
        const userData = await googleLogin({
          token: response.credential,
        }).unwrap();
        handleAuthSuccess(userData);
        setSuccessMessage('Google login successful!');
      } catch (error) {
        setError(handleAuthError(error));
      }
    } else {
      setError('No credential received from Google.');
    }
  };

  const handleGoogleFailure = () => {
    console.error('Google login failed');
    setError(
      'Google login failed. Please try again or use email/password login.'
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
          Welcome Back
        </motion.h2>
        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Sign in to your account to continue trading
        </motion.p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
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
                {error}
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
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <div className="relative group">
            <Mail className="absolute w-4 h-4 left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="pl-10 h-11 transition-all border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={isLoginLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <a href="#" className="text-xs text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <div className="relative group">
            <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className="pl-10 pr-10 h-11 transition-all border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={isLoginLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoginLoading}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 text-base font-medium"
          disabled={isLoginLoading}
        >
          {isLoginLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing you in...
            </>
          ) : (
            <>
              Sign In
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
};

export default Login;
