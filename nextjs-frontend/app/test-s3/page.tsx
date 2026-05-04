'use client';

import { useState } from 'react';
import { posts, tokenStorage, API_BASE_URL } from '@/lib/api';

export default function TestS3Page() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Vui lòng chọn file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('title', 'S3 Debug Test');
      formData.append('content', 'Testing S3 upload');
      formData.append('type', 'post');
      formData.append('status', 'publish');
      
      if (file.type.startsWith('video/')) {
        formData.append('video', file);
      } else {
        formData.append('images[]', file);
      }

      // We use raw fetch to bypass apiRequest handleResponse and see the raw JSON
      const token = tokenStorage.get();
      const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      
      const response = await fetch(`${basePath}/posts`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
      });

      const responseText = await response.text();
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = responseText;
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseJson,
      });

    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">S3 Debugger</h1>
      
      <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Chọn ảnh hoặc video để test S3</label>
          <input 
            type="file" 
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        <button 
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang gửi API...' : 'Upload & Test'}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-md text-red-700">
          <h3 className="font-bold">Lỗi:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-gray-900 text-green-400 p-6 rounded-xl overflow-auto shadow-inner">
          <h3 className="text-white font-bold mb-4 border-b border-gray-700 pb-2">API Response Data</h3>
          
          <div className="mb-4">
            <span className="text-gray-400">Status: </span>
            <span className={result.status < 400 ? 'text-green-400' : 'text-red-400'}>
              {result.status} {result.statusText}
            </span>
          </div>

          <div className="mb-4">
            <h4 className="text-gray-400 mb-1">Body:</h4>
            <pre className="text-xs font-mono bg-black p-4 rounded text-blue-300 whitespace-pre-wrap break-all">
              {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
          
          <div className="mt-4">
            <h4 className="text-gray-400 mb-1">Kiểm tra kết quả S3:</h4>
            <ul className="list-disc pl-5 text-sm">
              <li>Nếu Status là 500, S3 credentials hoặc policy trên server bị sai.</li>
              <li>Nếu Status là 201/200 nhưng không có trường images/video trong response, server có thể đã catch lỗi S3 và im lặng lưu bài viết.</li>
              <li>Nếu URL trả về bắt đầu bằng localhost thay vì s3 domain, FILESYSTEM_DISK trên server đang bị set sai (local thay vì s3).</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
