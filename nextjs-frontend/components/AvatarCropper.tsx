'use client';

import { useState, useCallback } from 'react';
import ReactEasyCrop, { type Area } from 'react-easy-crop';

interface AvatarCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export default function AvatarCropper({ imageSrc, onCropComplete, onCancel }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChangeHandler = useCallback((crop: any) => {
    setCrop(crop);
  }, []);

  const onZoomChangeHandler = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const image = new Image();
      image.src = imageSrc;

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error('Could not get canvas context');
          setIsProcessing(false);
          return;
        }

        // Set canvas dimensions to the cropped area size
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Draw the cropped image on canvas
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            onCropComplete(blob);
          } else {
            console.error('Failed to create blob from canvas');
          }
          setIsProcessing(false);
        }, 'image/jpeg', 0.95);
      };

      image.onerror = () => {
        console.error('Failed to load image');
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Error cropping image:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Crop Your Avatar</h2>

          {/* Crop Container */}
          <div className="relative bg-gray-200 rounded-lg overflow-hidden mb-6 aspect-square">
            <ReactEasyCrop
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={true}
              onCropChange={onCropChangeHandler}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={onZoomChangeHandler}
            />
          </div>

          {/* Zoom Control */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCropAndUpload}
              disabled={isProcessing || !croppedAreaPixels}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Crop & Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
