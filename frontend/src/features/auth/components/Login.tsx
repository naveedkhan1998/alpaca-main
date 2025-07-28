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
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
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
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="text-green-800 border-green-200 bg-green-50">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="pl-10"
              disabled={isLoginLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className="pl-10"
              disabled={isLoginLoading}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          disabled={isLoginLoading}
        >
          {isLoginLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 bg-background text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="w-full">
        {isGoogleLoginLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
            useOneTap
            type="standard"
            theme="filled_black"
            size="large"
            shape="rectangular"
          />
        )}
      </div>
    </motion.div>
  );
};

export default Login;
