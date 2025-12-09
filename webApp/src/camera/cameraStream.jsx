import React, { useState, useEffect, useRef } from 'react';

function CameraStream({ theme = 'light' }) {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('checking');
  const intervalRef = useRef(null);

  // Your RPi IP address
  // const CAMERA_SERVER = 'http://192.168.100.43:5000';
  const CAMERA_SERVER = '10.20.7.178:5000';

  // Theme-based styling
  const themeClasses = {
    container: theme === 'dark'
      ? 'bg-gray-900 border-gray-700 text-white'
      : 'bg-white border-gray-200 text-gray-800',
    header: theme === 'dark' ? 'text-white' : 'text-gray-800',
    subtext: theme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: theme === 'dark' ? 'border-gray-600' : 'border-gray-300',
    button: {
      primary: theme === 'dark'
        ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-800'
        : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300',
      secondary: theme === 'dark'
        ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:bg-gray-100',
      success: theme === 'dark'
        ? 'bg-green-600 hover:bg-green-700 text-white'
        : 'bg-green-500 hover:bg-green-600 text-white'
    },
    status: {
      connected: 'text-green-500',
      checking: 'text-yellow-500',
      error: 'text-red-500'
    },
    error: theme === 'dark'
      ? 'bg-red-900 border-red-700 text-red-200'
      : 'bg-red-100 border-red-400 text-red-700',
    loading: theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
  };

  const checkCameraStatus = async () => {
    try {
      const response = await fetch(`${CAMERA_SERVER}/api/camera/status`);
      const data = await response.json();
      setCameraStatus(data.status);
      return data.status === 'connected';
    } catch (err) {
      setCameraStatus('error');
      setError('Cannot connect to camera server');
      return false;
    }
  };

  const captureImage = async () => {
    setIsLoading(true);
    setError('');

    try {
      const timestamp = new Date().getTime();
      const url = `${CAMERA_SERVER}/api/camera/capture?t=${timestamp}`;
      setImageUrl(url);
    } catch (err) {
      setError('Failed to capture image: ' + err.message);
      console.error('Camera error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkCameraStatus();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(captureImage, 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  return (
    <div className={`rounded-xl shadow-lg p-6 border ${themeClasses.container}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h2 className={`text-2xl font-bold ${themeClasses.header} mb-2`}>
            📸 Camera Stream
          </h2>
          <div className="flex items-center gap-4">
            <div className={`text-sm font-medium ${themeClasses.status[cameraStatus]}`}>
              ● {cameraStatus.charAt(0).toUpperCase() + cameraStatus.slice(1)}
            </div>
            <div className={`text-sm ${themeClasses.subtext}`}>
              {CAMERA_SERVER.replace('http://', '')}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          <button
            onClick={captureImage}
            disabled={isLoading || cameraStatus !== 'connected'}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.button.primary}`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Capturing...
              </span>
            ) : (
              'Capture Image'
            )}
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            disabled={cameraStatus !== 'connected'}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${autoRefresh ? themeClasses.button.success : themeClasses.button.secondary
              }`}
          >
            {autoRefresh ? '⏹️ Stop' : '🔄 Auto'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mb-6 px-4 py-3 rounded-lg border ${themeClasses.error}`}>
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Image Display Area */}
      <div className={`border-2 border-dashed rounded-xl p-6 min-h-[400px] flex items-center justify-center transition-colors duration-200 ${themeClasses.border}`}>
        {imageUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Camera Feed"
              className="max-w-full max-h-[600px] w-auto h-auto rounded-lg shadow-lg object-contain"
              onError={() => setError('Failed to load image - check camera connection')}
              style={{ maxWidth: '100%', maxHeight: '70vh', width: 'auto', height: 'auto' }}
            />
            {autoRefresh && (
              <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                🔄 Live ({Math.round(1000 / intervalRef.current?.delay || 0)} FPS)
              </div>
            )}
          </div>
        ) : (
          <div className={`text-center ${themeClasses.loading}`}>
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Capturing image...</span>
                  <span className="text-sm">Please wait</span>
                </div>
              </div>
            ) : cameraStatus === 'connected' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl">📷</div>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Camera Ready</span>
                  <span className="text-sm">Click "Capture Image" to start</span>
                </div>
              </div>
            ) : cameraStatus === 'checking' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Checking camera status...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl">❌</div>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Camera Unavailable</span>
                  <span className="text-sm">Check camera server connection</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className={`text-sm ${themeClasses.subtext}`}>
          <div className="flex flex-wrap gap-4">
            <span>Mode: <strong>{autoRefresh ? 'Auto-refresh (3s)' : 'Manual capture'}</strong></span>
            <span>Status: <strong className={themeClasses.status[cameraStatus]}>{cameraStatus}</strong></span>
          </div>
        </div>
        <div className={`text-xs ${themeClasses.subtext}`}>
          Raspberry Pi Camera Module
        </div>
      </div>
    </div>
  );
}

export default CameraStream;