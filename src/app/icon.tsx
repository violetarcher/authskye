import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        {/* Medical cross icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="white"
        >
          <rect x="9" y="2" width="6" height="20" rx="1" />
          <rect x="2" y="9" width="20" height="6" rx="1" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
