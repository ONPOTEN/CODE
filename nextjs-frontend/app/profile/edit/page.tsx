'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { users, ApiException } from '@/lib/api';
import AvatarCropper from '@/components/AvatarCropper';

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading, updateUserAvatar, updateUserProfile } = useAuth();
  const router = useRouter();

  // Profile form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [hobby, setHobby] = useState('');
  const [company, setCompany] = useState('');
  const [occupation, setOccupation] = useState('');
  const [mainOccupation, setMainOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState('user');
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [phone, setPhone] = useState('');
  const [emailPublic, setEmailPublic] = useState(true);
  const [hobbyPublic, setHobbyPublic] = useState(true);
  const [companyPublic, setCompanyPublic] = useState(true);
  const [occupationPublic, setOccupationPublic] = useState(true);
  const [mainOccupationPublic, setMainOccupationPublic] = useState(true);
  const [locationPublic, setLocationPublic] = useState(true);
  const [phonePublic, setPhonePublic] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Avatar form state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

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

  // Initialize form fields from user data - only after fresh data is fetched
  const [isInitialized, setIsInitialized] = useState(false);
  const [freshUserData, setFreshUserData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch fresh user data from API on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && !freshUserData && !isFetching) {
        setIsFetching(true);
        try {
          console.log('[Profile Edit] Fetching fresh user data from API...');
          const response = await users.getById(user.id);
          console.log('[Profile Edit] Fresh user data received:', response);
          console.log('[Profile Edit] Response has data property?', 'data' in response);
          // Extract data from response if it's wrapped in a data object
          const userData = response && typeof response === 'object' && 'data' in response
            ? response.data
            : response;
          console.log('[Profile Edit] Extracted userData:', userData);
          console.log('[Profile Edit] userData.occupation:', userData?.occupation);
          console.log('[Profile Edit] userData.main_occupation:', userData?.main_occupation);
          setFreshUserData(userData);
        } catch (error) {
          console.error('[Profile Edit] Error fetching user profile:', error);
          // Fall back to using cached user data
          setFreshUserData(user);
        }
      }
    };

    fetchUserProfile();
  }, [user, freshUserData, isFetching]);

  // Initialize form fields ONLY after freshUserData is available
  useEffect(() => {
    // Wait for freshUserData to be fetched before initializing
    if (freshUserData && !isInitialized) {
      console.log('[Profile Edit] Initializing form fields from freshUserData:', freshUserData);
      console.log('[Profile Edit] Occupation value:', freshUserData.occupation);
      console.log('[Profile Edit] Main occupation value:', freshUserData.main_occupation);
      setUsername(freshUserData.username || '');
      setDisplayName(freshUserData.display_name || '');
      setEmail(freshUserData.email || '');
      setHobby(freshUserData.hobby || '');
      setCompany(freshUserData.company || '');
      setOccupation(freshUserData.occupation || '');
      setMainOccupation(freshUserData.main_occupation || '');
      setLocation(freshUserData.location || '');
      setRole(freshUserData.role || 'user');
      setProfileVisibility(freshUserData.profile_visibility || 'public');
      setPhone(freshUserData.phone || '');
      // Helper to convert API value to boolean (handles true, 1, "1", "true")
      const toBool = (val: any): boolean => val === true || val === 1 || val === "1" || val === "true";

      console.log('[Profile Edit] Raw public values:', {
        email_public: freshUserData.email_public,
        hobby_public: freshUserData.hobby_public,
        company_public: freshUserData.company_public,
        occupation_public: freshUserData.occupation_public,
        main_occupation_public: freshUserData.main_occupation_public,
        location_public: freshUserData.location_public,
        phone_public: freshUserData.phone_public,
      });
	/*
      setEmailPublic(toBool(freshUserData.email_public));
      setHobbyPublic(toBool(freshUserData.hobby_public));
      setCompanyPublic(toBool(freshUserData.company_public));
      setOccupationPublic(toBool(freshUserData.occupation_public));
      setMainOccupationPublic(toBool(freshUserData.main_occupation_public));
      setLocationPublic(toBool(freshUserData.location_public));
      setPhonePublic(toBool(freshUserData.phone_public));
	*/
	  setEmailPublic(freshUserData.email_public !== false);
      setHobbyPublic(freshUserData.hobby_public !== false);
      setCompanyPublic(freshUserData.company_public !== false);
	  setOccupationPublic(freshUserData.occupation_public !== false);
      setMainOccupationPublic(freshUserData.main_occupation_public !== false);
      setLocationPublic(user.location_public !== false);
      setPhonePublic(user.phone_public !== false);
      setIsInitialized(true);
      console.log('[Profile Edit] Form fields initialized with occupation:', freshUserData.occupation, 'main_occupation:', freshUserData.main_occupation);
    }
  }, [freshUserData, isInitialized]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setUsernameError(null);

    // Validate username if it has changed
    if (username !== user?.username) {
      if (!username.trim()) {
        setUsernameError('Username cannot be empty');
        return;
      }
      if (username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        return;
      }
      if (username.length > 60) {
        setUsernameError('Username cannot exceed 60 characters');
        return;
      }
      // Check for valid characters (alphanumeric, underscore, hyphen)
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
        return;
      }
    }

    try {
      setProfileLoading(true);

      console.log('[Profile Edit] Starting profile update...');

      // Build the update object - only send fields that should be updated
      const updateData: any = {};

      // Always include these fields
      if (displayName) updateData.display_name = displayName;
      if (email) updateData.user_email = email;

      // Include username if changed
      if (username !== user?.username) {
        updateData.user_login = username;
      }

      // Always include these optional fields
      updateData.hobby = hobby || null;
      updateData.company = company || null;
      updateData.occupation = occupation || null;
      updateData.main_occupation = mainOccupation || null;
      updateData.location = location || null;
      updateData.profile_visibility = profileVisibility;
      updateData.email_public = emailPublic;
      updateData.hobby_public = hobbyPublic;
      updateData.company_public = companyPublic;
      updateData.occupation_public = occupationPublic;
      updateData.main_occupation_public = mainOccupationPublic;
      updateData.location_public = locationPublic;
      updateData.phone_public = phonePublic;

      console.log('[Profile Edit] Update data:', updateData);
      console.log('[Profile Edit] Occupation value:', occupation);
      console.log('[Profile Edit] Occupation public:', occupationPublic);

      const response = await users.updateProfile(updateData);

      console.log('[Profile Edit] Profile update successful!');
      console.log('[Profile Edit] Response:', response);

      // Update the auth context directly with simple mapping
      try {
        if (response && typeof response === 'object') {
          console.log('[Profile Edit] Updating auth context...');
          updateUserProfile({
            display_name: displayName,
            email: email,
            hobby: hobby || undefined,
            company: company || undefined,
            occupation: occupation || undefined,
            main_occupation: mainOccupation || undefined,
            location: location || undefined,
            profile_visibility: profileVisibility,
            email_public: emailPublic,
            hobby_public: hobbyPublic,
            company_public: companyPublic,
            occupation_public: occupationPublic,
            main_occupation_public: mainOccupationPublic,
            location_public: locationPublic,
            phone_public: phonePublic,
          });
          console.log('[Profile Edit] Auth context updated successfully');
        }
      } catch (updateError) {
        console.error('[Profile Edit] Error updating auth context:', updateError);
        // Continue anyway - don't block the redirect
      }

      // Show success message
      setProfileSuccess(true);

      // Redirect to profile page after 1 second
      setTimeout(() => {
        console.log('[Profile Edit] Redirecting to profile page...');
        router.push('/profile');
      }, 1000);

    } catch (err) {
      console.error('[Profile Edit] Full error object:', err);

      if (err instanceof ApiException) {
        console.error('[Profile Edit] API Exception details:', {
          message: err.message,
          status: err.status,
          errors: err.errors,
        });

        // Check if error is related to username
        if (err.message.includes('user_login') || err.message.includes('username')) {
          setUsernameError(err.message);
        } else if (err.message.includes('user_email') || err.message.includes('email')) {
          setProfileError(`Email error: ${err.message}`);
        } else if (err.errors) {
          // Handle validation errors from API
          const firstErrorKey = Object.keys(err.errors)[0];
          const firstErrorMsg = err.errors[firstErrorKey];
          setProfileError(Array.isArray(firstErrorMsg) ? firstErrorMsg[0] : firstErrorMsg);
        } else {
          setProfileError(err.message);
        }
      } else if (err instanceof Error) {
        console.error('[Profile Edit] Error message:', err.message);
        setProfileError(err.message);
      } else {
        setProfileError('Failed to update profile');
      }
      console.error('Error updating profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const validateAvatarFile = (file: File): string | null => {
    const maxSize = 2 * 1024 * 1024; // 2MB
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];

    console.log('[validateAvatarFile] Validating file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      maxSize,
      validTypes,
    });

    if (file.size > maxSize) {
      return `File size must not exceed 2MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }

    if (!validTypes.includes(file.type)) {
      return `Invalid file type: ${file.type}. Only JPEG, PNG, and GIF are allowed.`;
    }

    return null;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[handleAvatarChange] File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Validate file
      const validationError = validateAvatarFile(file);
      if (validationError) {
        setAvatarError(validationError);
        setAvatarFile(null);
        setAvatarPreview(null);
        return;
      }

      setAvatarError(null);
      setAvatarFile(file);

      // Create image data URL for cropper
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setImageToCrop(imageData);
        setShowAvatarCropper(true);
      };
      reader.onerror = () => {
        setAvatarError('Failed to read file');
        setAvatarFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarCropComplete = async (croppedBlob: Blob) => {
    try {
      console.log('[handleAvatarCropComplete] Crop complete, uploading:', {
        blobSize: croppedBlob.size,
        blobType: croppedBlob.type,
      });

      setAvatarLoading(true);
      setShowAvatarCropper(false);
      setImageToCrop(null);

      // Create a File object from the blob
      const croppedFile = new File([croppedBlob], 'avatar-cropped.jpg', {
        type: 'image/jpeg',
      });

      // Upload the cropped image
      const response = await users.uploadAvatar(croppedFile);

      console.log('[handleAvatarCropComplete] Upload successful:', {
        avatarUrl: response.avatar_url,
      });

      // Create preview from cropped blob
      const previewUrl = URL.createObjectURL(croppedBlob);
      setAvatarPreview(previewUrl);

      // Update user avatar in auth context
      if (response.avatar_url) {
        updateUserAvatar(response.avatar_url);
      }

      setAvatarSuccess(true);
      setAvatarFile(null);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setAvatarSuccess(false);
        // Clean up the preview URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      }, 3000);
    } catch (err) {
      console.error('[handleAvatarCropComplete] Error uploading cropped avatar:', err);

      if (err instanceof ApiException) {
        if (err.errors?.avatar) {
          const avatarErrors = Array.isArray(err.errors.avatar)
            ? err.errors.avatar.join(', ')
            : err.errors.avatar;
          setAvatarError(`Validation error: ${avatarErrors}`);
        } else {
          setAvatarError(err.message);
        }
      } else if (err instanceof Error) {
        setAvatarError(err.message);
      } else {
        setAvatarError('Failed to upload avatar');
      }
    } finally {
      setAvatarLoading(false);
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

    // Validate file again before submit
    const validationError = validateAvatarFile(avatarFile);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    try {
      console.log('[handleAvatarSubmit] Uploading avatar:', {
        fileName: avatarFile.name,
        fileSize: avatarFile.size,
        fileType: avatarFile.type,
      });

      setAvatarLoading(true);
      const response = await users.uploadAvatar(avatarFile);

      console.log('[handleAvatarSubmit] Upload successful:', {
        avatarUrl: response.avatar_url,
      });

      // Update user avatar in auth context
      if (response.avatar_url) {
        updateUserAvatar(response.avatar_url);
      }

      setAvatarSuccess(true);
      setAvatarFile(null);
      setAvatarPreview(null);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setAvatarSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('[handleAvatarSubmit] Error uploading avatar:', err);

      if (err instanceof ApiException) {
        // Check for validation errors from API
        if (err.errors?.avatar) {
          const avatarErrors = Array.isArray(err.errors.avatar)
            ? err.errors.avatar.join(', ')
            : err.errors.avatar;
          setAvatarError(`Validation error: ${avatarErrors}`);
        } else {
          setAvatarError(err.message);
        }
      } else if (err instanceof Error) {
        setAvatarError(err.message);
      } else {
        setAvatarError('Failed to upload avatar');
      }
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
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-gray-900 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profile
          </Link>
        </div>

        {/* Profile Information Form */}
        <div className="bg-grey-200 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Information
          </h2>

          {profileSuccess && (
            <div className="mb-4 bg-grey-200 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Profile updated successfully!</p>
            </div>
          )}

          {profileError && (
            <div className="mb-4 bg-grey-200 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{profileError}</p>
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                  {username !== user?.username && (
                    <span className="text-amber-600 text-xs ml-2">● Changed</span>
                  )}
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-colors ${
                    usernameError
                      ? 'border-red-300 focus:ring-red-500 bg-grey-200'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Enter your username"
                  required
                />
                {usernameError && (
                  <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  3-60 characters. Letters, numbers, underscores, and hyphens only.
                </p>
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
                <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                  Nghề Nghiệp (Occupation)
                </label>
                <input
                  type="text"
                  id="occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="What is your occupation?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="occupationPublic"
                    checked={occupationPublic}
                    onChange={(e) => setOccupationPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="occupationPublic" className="ml-2 text-sm text-gray-600">
                    Make occupation public (visible to non-friends)
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="mainOccupation" className="block text-sm font-medium text-gray-700 mb-1">
                  Nghề Nghiệp Chính (Main Occupation)
                </label>
                <input
                  type="text"
                  id="mainOccupation"
                  value={mainOccupation}
                  onChange={(e) => setMainOccupation(e.target.value)}
                  placeholder="What is your main occupation?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="mainOccupationPublic"
                    checked={mainOccupationPublic}
                    onChange={(e) => setMainOccupationPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="mainOccupationPublic" className="ml-2 text-sm text-gray-600">
                    Make main occupation public (visible to non-friends)
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
                  Phone Number (cannot be changed)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-blue-500 text-gray-600 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Phone number is locked for security. Contact support to change your phone number.
                </p>
                <div className="mt-3 flex items-center">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-blue-500 text-gray-600 cursor-not-allowed capitalize"
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
                className="w-full bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? 'Updating...' : 'Update Profile Information'}
              </button>
            </div>
          </form>
        </div>

        {/* Avatar Upload Form */}
        <div className="bg-grey-200 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Profile Avatar
          </h2>

          {avatarSuccess && (
            <div className="mb-4 bg-grey-200 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Avatar uploaded successfully!</p>
            </div>
          )}

          {avatarError && (
            <div className="mb-4 bg-grey-200 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{avatarError}</p>
            </div>
          )}

          <form onSubmit={handleAvatarSubmit}>
            <div className="space-y-4">
              {/* Avatar Preview */}
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-500 border-2 border-gray-300">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt="Current avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-gray-900 text-3xl font-bold">
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
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-grey-200 file:text-blue-700 hover:file:bg-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG, or GIF (max. 2MB)</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={avatarLoading || !avatarFile}
                className="w-full bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {avatarLoading ? 'Uploading...' : 'Upload Avatar'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-grey-200 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change Password
          </h2>

          {passwordSuccess && (
            <div className="mb-4 bg-grey-200 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Password updated successfully!</p>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 bg-grey-200 border border-red-200 rounded-lg p-4">
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
                className="w-full bg-blue-500 hover:bg-blue-700 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Avatar Cropper Modal */}
      {showAvatarCropper && imageToCrop && (
        <AvatarCropper
          imageSrc={imageToCrop}
          onCropComplete={handleAvatarCropComplete}
          onCancel={() => {
            setShowAvatarCropper(false);
            setImageToCrop(null);
            setAvatarFile(null);
            setAvatarError(null);
          }}
        />
      )}
    </div>
  );
}
