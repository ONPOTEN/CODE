import { ImageResponse } from 'next/og';

export const alt = 'Centimet2 - Sàn thương mại';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2563eb',
            borderRadius: 24,
            width: 120,
            height: 120,
            fontSize: 64,
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          C2
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 48,
            fontWeight: 700,
            color: '#111827',
          }}
        >
          Centimet2
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 24,
            color: '#6b7280',
          }}
        >
          Sàn thương mại hiện đại
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
