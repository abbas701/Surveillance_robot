import React, { useState, useEffect, useRef } from 'react';
function MpegCameraStream({ theme = 'light' }) {
    const [streamUrl, setStreamUrl] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState('');
    const [cameraStatus, setCameraStatus] = useState('checking');
    const [mode, setMode] = useState('single'); // 'single' or 'stream'
    const videoRef = useRef(null);

    const RPI_IP = import.meta.env.VITE_ROBOT_IP;
    const CAMERA_PORT = import.meta.env.VITE_CAMERA_PORT;
    const CAMERA_SERVER = `http://${RPI_IP}:${CAMERA_PORT}`;

    const themeClasses = {
        container: theme === 'dark'
            ? 'bg-gray-900 border-gray-700 text-white'
            : 'bg-white border-gray-200 text-gray-800',
        header: theme === 'dark' ? 'text-white' : 'text-gray-800',
        subtext: theme === 'dark' ? 'text-gray-300' : 'text-gray-600',
        border: theme === 'dark' ? 'border-gray-600' : 'border-gray-300',
        button: {
            primary: theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white',
            secondary: theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
            success: theme === 'dark'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white',
            danger: theme === 'dark'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
        }
    };

const checkCameraStatus = async () => {
    try {
        console.log('Attempting to fetch from:', `${CAMERA_SERVER}/api/camera/status`);
        
        const response = await fetch(`${CAMERA_SERVER}/api/camera/status`, {
            method: 'GET',
            mode: 'cors',
        });
        
        console.log('Response status:', response.status);
        console.log('Response content-type:', response.headers.get('content-type'));
        
        // Get the raw text first to see what's actually returned
        const rawText = await response.text();
        console.log('Raw response (first 200 chars):', rawText.substring(0, 200));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if it's actually JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = JSON.parse(rawText);
            console.log('Response data:', data);
            setCameraStatus(data.status);
        } else {
            throw new Error(`Expected JSON but got: ${contentType}`);
        }
        
    } catch (err) {
        console.error('Camera status check failed:', err);
        setCameraStatus('error');
        setError(`Cannot connect to camera server: ${err.message}`);
    }
};

    const startStream = async () => {
        try {
            setError('');
            setIsStreaming(true);
            setMode('stream');

            // Add timestamp to force new request (avoid cache)
            const timestamp = new Date().getTime();
            setStreamUrl(`${CAMERA_SERVER}/api/camera/stream/start?t=${timestamp}`);

        } catch (err) {
            setError('Failed to start stream: ' + err.message);
            setIsStreaming(false);
        }
    };

    const stopStream = async () => {
        try {
            await fetch(`${CAMERA_SERVER}/api/camera/stream/stop`);
            setIsStreaming(false);
            setStreamUrl('');
            setMode('single');
        } catch (err) {
            console.error('Error stopping stream:', err);
        }
    };

    const captureSingleImage = async () => {
        setError('');
        setMode('single');

        try {
            const timestamp = new Date().getTime();
            const url = `${CAMERA_SERVER}/api/camera/capture?t=${timestamp}`;
            setStreamUrl(url);
        } catch (err) {
            setError('Failed to capture image: ' + err.message);
        }
    };

    useEffect(() => {
        checkCameraStatus();

        // Cleanup on unmount
        return () => {
            if (isStreaming) {
                stopStream();
            }
        };
    }, []);

    return (
        <div className={`rounded-xl shadow-lg p-6 border ${themeClasses.container}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex-1">
                    <h2 className={`text-2xl font-bold ${themeClasses.header} mb-2`}>
                        📸 Camera Feed
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className={`text-sm font-medium ${cameraStatus === 'connected' ? 'text-green-500' :
                            cameraStatus === 'checking' ? 'text-yellow-500' : 'text-red-500'
                            }`}>
                            ● {cameraStatus.charAt(0).toUpperCase() + cameraStatus.slice(1)}
                        </div>
                        <div className={`text-sm ${themeClasses.subtext}`}>
                            Mode: <strong>{isStreaming ? 'Live Stream' : 'Single Capture'}</strong>
                        </div>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={captureSingleImage}
                        disabled={isStreaming}
                        className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 ${mode === 'single' ? themeClasses.button.primary : themeClasses.button.secondary
                            }`}
                    >
                        📷 Single Shot
                    </button>

                    {!isStreaming ? (
                        <button
                            onClick={startStream}
                            disabled={cameraStatus !== 'connected'}
                            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 ${themeClasses.button.success}`}
                        >
                            🎥 Start Stream
                        </button>
                    ) : (
                        <button
                            onClick={stopStream}
                            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${themeClasses.button.danger}`}
                        >
                            ⏹️ Stop Stream
                        </button>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className={`mb-6 px-4 py-3 rounded-lg border ${theme === 'dark' ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Video/Image Display */}
            <div className={`border-2 border-dashed rounded-xl p-4 min-h-[500px] flex items-center justify-center transition-colors duration-200 ${themeClasses.border}`}>
                {streamUrl ? (
                    <div className="w-full h-full flex items-center justify-center">
                        {isStreaming ? (
                            // MJPEG Stream
                            <img
                                src={streamUrl}
                                alt="Live Camera Feed"
                                className="max-w-full max-h-[70vh] w-auto h-auto rounded-lg shadow-lg"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '70vh',
                                    width: 'auto',
                                    height: 'auto'
                                }}
                                onError={() => setError('Failed to load video stream')}
                            />
                        ) : (
                            // Single Image
                            <img
                                src={streamUrl}
                                alt="Camera Capture"
                                className="max-w-full max-h-[70vh] w-auto h-auto rounded-lg shadow-lg"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '70vh',
                                    width: 'auto',
                                    height: 'auto'
                                }}
                                onError={() => setError('Failed to load image')}
                            />
                        )}
                    </div>
                ) : (
                    <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-6xl">📷</div>
                            <div className="flex flex-col gap-2">
                                <span className="font-medium text-lg">Camera Ready</span>
                                <span className="text-sm">Choose a mode to start</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className={`text-sm ${themeClasses.subtext}`}>
                    <div className="flex flex-wrap gap-4">
                        <span>Server: <strong>{CAMERA_SERVER.replace('http://', '')}</strong></span>
                        <span>Mode: <strong>{isStreaming ? 'Live Video (MJPEG)' : 'Single Image'}</strong></span>
                    </div>
                </div>
                <div className={`text-xs ${themeClasses.subtext}`}>
                    {isStreaming ? '~20 FPS Stream' : 'High Quality Capture'}
                </div>
            </div>
        </div>
    );
}

export default MpegCameraStream;