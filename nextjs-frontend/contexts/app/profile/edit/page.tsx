'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { users, ApiException } from '@/lib/api';

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [hobby, setHobby] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState('user');
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [phone, setPhone] = useState('');
  const [emailPublic, setEmailPublic] = useState(true);
  const [hobbyPublic, setHobbyPublic] = useState(true);
  const [companyPublic, setCompanyPublic] = useState(true);
  const [locationPublic, setLocationPublic] = useState(true);
  const [phonePublic, setPhonePublic] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Avatar form state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setEmail(user.email || '');
      setHobby(user.hobby || '');
      setCompany(user.company || '');
      setLocation(user.location || '');
      setRole(user.role || 'user');
      setProfileVisibility(user.profile_visibility || 'public');
      setPhone(user.phone || '');
      setEmailPublic(user.email_public !== false);
      setHobbyPublic(user.hobby_public !== false);
      setCompanyPublic(user.company_public !== false);
      setLocationPublic(user.location_public !== false);
      setPhonePublic(user.phone_public !== false);
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    try {
      setProfileLoading(true);
      await users.updateProfile({
        display_name: displayName,
        user_email: email,
        hobby: hobby,
        company: company,
        location: location,
        // role: role, // REMOVED: Users cannot change their own role
        profile_visibility: profileVisibility,
        phone: phone,
        email_public: emailPublic,
        hobby_public: hobbyPublic,
        company_public: companyPublic,
        location_public: locationPublic,
        phone_public: phonePublic,
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiException) {
        setProfileError(err.message);
      } else {
        setProfileError('Failed to update profile');
      }
      console.error('Error updating profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvatarError(null);
    setAvatarSuccess(false);

    if (!avatarFile) {
      setAvatarError('Please select an image file');
      return;
    }

    try {
      setAvatarLoading(true);
      await users.uploadAvatar(avatarFile);

      setAvatarSuccess(true);
      setTimeout(() => {
        setAvatarSuccess(false);
        window.location.reload(); // Reload to update avatar in header
      }, 2000);
    } catch (err) {
      if (err instanceof ApiException) {
        setAvatarError(err.message);
      } else {
        setAvatarError('Failed to upload avatar');
      }
      console.error('Error uploading avatar:', err);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    try {
      setPasswordLoading(true);
      await users.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiException) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Failed to update password');
      }
      console.error('Error updating password:', err);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <Link
            href="/profile"
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profile
          </Link>
        </div>

        {/* Profile Information Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Information
          </h2>

          {profileSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Profile updated successfully!</p>
            </div>
          )}

          {profileError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{profileError}</p>
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username (cannot be changed)
                </label>
                <input
                  type="text"
                  id="username"
                  value={user.username}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="emailPublic"
                    checked={emailPublic}
                    onChange={(e) => setEmailPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="emailPublic" className="ml-2 text-sm text-gray-600">
                    Make email public (visible to non-friends)
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="hobby" className="block text-sm font-medium text-gray-700 mb-1">
                  Hobby
                </label>
                <input
                  type="text"
                  id="hobby"
                  value={hobby}
                  onChange={(e) => setHobby(e.target.value)}
                  placeholder="What do you like to do?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="hobbyPublic"
                    checked={hobbyPublic}
                    onChange={(e) => setHobbyPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="hobbyPublic" className="ml-2 text-sm text-gray-600">
                    Make hobby public (visible to non-friends)
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Where do you work?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="companyPublic"
                    checked={companyPublic}
                    onChange={(e) => setCompanyPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="companyPublic" className="ml-2 text-sm text-gray-600">
                    Make company public (visible to non-friends)
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where are you based?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="locationPublic"
                    checked={locationPublic}
                    onChange={(e) => setLocationPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="locationPublic" className="ml-2 text-sm text-gray-600">
                    Make location public (visible to non-friends)
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="phonePublic"
                    checked={phonePublic}
                    onChange={(e) => setPhonePublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="phonePublic" className="ml-2 text-sm text-gray-600">
                    Make phone public (visible to non-friends)
                  </label>
                </div>
              </div>

              {/* Role field - Read-only, only admins can change roles */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  id="role"
                  value={role}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed capitalize"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your role cannot be changed. Contact an administrator if you need role changes.
                </p>
              </div>

              <div>
                <label htmlFor="profileVisibility" className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Visibility
                </label>
                <select
                  id="profileVisibility"
                  value={profileVisibility}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="public">Public - Anyone can view my profile</option>
                  <option value="private">Private - Only friends can view my profile</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {profileVisibility === 'public' ? 'Your profile is visible to everyone' : 'Your profile is only visible to your friends'}
                </p>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? 'Updating...' : 'Update Profile Information'}
              </button>
            </div>
          </form>
        </div>

        {/* Avatar Upload Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Profile Avatar
          </h2>

          {avatarSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Avatar uploaded successfully!</p>
            </div>
          )}

          {avatarError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{avatarError}</p>
            </div>
          )}

          <form onSubmit={handleAvatarSubmit}>
            <div className="space-y-4">
              {/* Avatar Preview */}
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/storage/avatars/${user.avatar}`} alt="Current avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                        {user?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Avatar Image
                  </label>
                  <input
                    type="file"
                    id="avatar"
                    accept="image/jpeg,image/png,image/jpg,image/gif"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG, or GIF (max. 2MB)</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={avatarLoading || !avatarFile}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {avatarLoading ? 'Uploading...' : 'Upload Avatar'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change Password
          </h2>

          {passwordSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Password updated successfully!</p>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{passwordError}</p>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
