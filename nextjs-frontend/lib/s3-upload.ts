/**
 * S3 Upload Utilities
 * Handles uploads to S3 bucket via Laravel proxy (to bypass CORS issues)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.centimet2.com/api/v1';

export interface UploadResponse {
  success: boolean;
  file_url: string;
  file_key: string;
}

export interface PresignedUrlResponse {
  presigned_url: string;
  file_key: string;
}

/**
 * Upload a file to S3 via Laravel proxy (recommended - avoids CORS issues)
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress
 * @returns The file URL for the uploaded file
 */
export const uploadFileViaProxy = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const token = localStorage.getItem('api_token');

  console.log('[s3-upload] Starting proxy upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          console.log(`[s3-upload] Upload progress for ${file.name}: ${progress.toFixed(2)}%`);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      console.log(`[s3-upload] Upload completed with status: ${xhr.status}`);
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success && response.file_url) {
            console.log('[s3-upload] File URL:', response.file_url);
            resolve(response.file_url);
          } else {
            console.error('[s3-upload] Upload response missing file_url:', response);
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch (e) {
          console.error('[s3-upload] Failed to parse response:', xhr.responseText);
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        console.error(`[s3-upload] Upload failed with status ${xhr.status}`, xhr.responseText);
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('[s3-upload] XHR error event fired');
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      console.warn('[s3-upload] Upload was aborted');
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', `${API_BASE_URL}/s3/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

/**
 * Upload multiple files to S3 via proxy in sequence
 * @param files - Array of files to upload
 * @param onProgress - Optional callback for overall progress
 * @returns Array of file URLs
 */
export const uploadMultipleViaProxy = async (
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
  const results: string[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const url = await uploadFileViaProxy(files[i]);
      results.push(url);
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`Failed to upload ${files[i].name}:`, error);
      throw error;
    }
  }

  return results;
};

// Legacy functions kept for backwards compatibility
// These use presigned URLs which may have CORS issues

/**
 * Get a presigned URL from the backend for direct S3 upload
 * @deprecated Use uploadFileViaProxy instead to avoid CORS issues
 * @param filename - The name of the file to upload
 * @param contentType - The MIME type of the file
 * @returns Presigned URL and file key for direct S3 upload
 */
export const getPresignedUrl = async (
  filename: string,
  contentType: string
): Promise<PresignedUrlResponse> => {
  const token = localStorage.getItem('api_token');

  console.log('[s3-upload] Requesting presigned URL for:', filename);

  const response = await fetch(`${API_BASE_URL}/s3/presigned-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename,
      content_type: contentType,
    }),
  });

  console.log('[s3-upload] Presigned URL response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[s3-upload] Error response:', errorText);
    throw new Error(`Failed to get presigned URL: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[s3-upload] Successfully got presigned URL:', {
    file_key: data.file_key,
    expires_in: data.expires_in,
  });

  return data;
};

/**
 * Upload a file directly to S3 using a presigned URL
 * @deprecated Use uploadFileViaProxy instead to avoid CORS issues
 * @param presignedUrl - The presigned URL from the backend
 * @param file - The file to upload
 * @param contentType - The MIME type of the file
 * @param onProgress - Optional callback for upload progress
 * @returns The file key/URL for the uploaded file
 */
export const uploadToS3 = async (
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log('[s3-upload] Starting S3 upload for file:', file.name, 'Size:', file.size, 'Type:', contentType);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          console.log(`[s3-upload] Upload progress for ${file.name}: ${progress.toFixed(2)}%`);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      console.log(`[s3-upload] Upload completed with status: ${xhr.status}`);
      if (xhr.status === 200 || xhr.status === 201) {
        const fileUrl = presignedUrl.split('?')[0]; // Return the URL without query params
        console.log('[s3-upload] File URL:', fileUrl);
        resolve(fileUrl);
      } else {
        console.error(`[s3-upload] Upload failed with status ${xhr.status}`, xhr.responseText);
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('[s3-upload] XHR error event fired');
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      console.warn('[s3-upload] Upload was aborted');
      reject(new Error('Upload aborted'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
};

/**
 * Upload multiple files to S3 in parallel
 * @deprecated Use uploadMultipleViaProxy instead to avoid CORS issues
 * @param files - Array of files to upload
 * @param onProgress - Optional callback for overall progress
 * @returns Array of file URLs
 */
export const uploadMultipleToS3 = async (
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<string[]> => {
  const uploadPromises = files.map(async (file) => {
    try {
      const presignedResponse = await getPresignedUrl(
        file.name,
        file.type || 'image/jpeg'
      );

      const fileUrl = await uploadToS3(
        presignedResponse.presigned_url,
        file,
        file.type || 'image/jpeg'
      );

      return fileUrl;
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw error;
    }
  });

  const results: string[] = [];
  for (let i = 0; i < uploadPromises.length; i++) {
    try {
      const url = await uploadPromises[i];
      results.push(url);
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      throw error;
    }
  }

  return results;
};
