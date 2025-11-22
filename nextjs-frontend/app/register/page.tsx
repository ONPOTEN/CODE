'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '', // for user_login (unique username)
    email: '',
    password: '',
    password_confirmation: '',
    display_name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const { register, isLoading, error, validationErrors } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Check password match
    if (name === 'password' || name === 'password_confirmation') {
      const password = name === 'password' ? value : formData.password;
      const confirmPassword = name === 'password_confirmation' ? value : formData.password_confirmation;
      setPasswordMatch(password === confirmPassword || confirmPassword === '');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.password_confirmation) {
      setPasswordMatch(false);
      return;
    }

    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    if (!formData.username) {
      alert('Username is required');
      return;
    }

    if (!formData.display_name) {
      alert('Display name is required');
      return;
    }

    try {
      // Call Laravel backend registration (wp_users direct database)
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        display_name: formData.display_name,
      });
      router.push('/'); // Redirect to home after successful registration
    } catch (err) {
      // Error is already handled in AuthContext
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-grey-200 p-4">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors && (
          <div className="rounded-md bg-grey-200 p-4">
            {Object.entries(validationErrors).map(([field, messages]) => (
              <p key={field} className="text-sm font-medium text-red-800">
                <strong>{field}:</strong> {messages.join(', ')}
              </p>
            ))}
          </div>
        )}

        {/* Signup Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Display Name */}
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="John Doe"
              value={formData.display_name}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">Unique username for login</p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password_confirmation"
                name="password_confirmation"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  passwordMatch ? 'border-gray-300' : 'border-red-300'
                }`}
                placeholder="••••••••"
                value={formData.password_confirmation}
                onChange={handleChange}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-600"
                disabled={isLoading}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {!passwordMatch && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !passwordMatch}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
