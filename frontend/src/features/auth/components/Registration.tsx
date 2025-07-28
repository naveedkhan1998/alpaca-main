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
import { Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';
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
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Create your account</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Join us and start trading with confidence
        </p>
      </div>

      <form onSubmit={handleRegisterSubmit} className="space-y-4">
        {registerError && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{registerError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="text-green-800 border-green-200 bg-green-50">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="registerName">Full Name</Label>
          <div className="relative">
            <User className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              id="registerName"
              placeholder="Enter your full name"
              value={registerName}
              onChange={e => setRegisterName(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerEmail">Email</Label>
          <div className="relative">
            <Mail className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              id="registerEmail"
              type="email"
              placeholder="Enter your email"
              value={registerEmail}
              onChange={e => setRegisterEmail(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerPassword">Password</Label>
          <div className="relative">
            <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              id="registerPassword"
              type="password"
              placeholder="Choose a strong password"
              value={registerPassword}
              onChange={e => setRegisterPassword(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerPassword2">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              id="registerPassword2"
              type="password"
              placeholder="Confirm your password"
              value={registerPassword2}
              onChange={e => setRegisterPassword2(e.target.value)}
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={checked => setAcceptTerms(checked as boolean)}
            required
          />
          <Label
            htmlFor="terms"
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            I accept the{' '}
            <a href="#" className="text-indigo-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-indigo-600 hover:underline">
              Privacy Policy
            </a>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          disabled={isRegisterLoading}
        >
          {isRegisterLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
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
}
