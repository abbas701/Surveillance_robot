import React, { useRef, useState, useEffect } from "react";
import axios from "axios";

function CameraMountJoystick() {
    const joystickRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [currentAngle, setCurrentAngle] = useState(null);
    const lastSentAngleRef = useRef(null);

    const handleTouchStart = (e) => {
        setIsDragging(true);
        updatePosition(e);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        updatePosition(e);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setPosition({ x: 0, y: 0 });
        setCurrentAngle(null);
        lastSentAngleRef.current = null;
    };

    const updatePosition = (e) => {
        if (!joystickRef.current) return;

        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left - centerX;
        const y = clientY - rect.top - centerY;

        // Limit to joystick bounds
        const distance = Math.min(Math.sqrt(x * x + y * y), centerX);
        const angle = Math.atan2(y, x);

        const boundedX = Math.cos(angle) * distance;
        const boundedY = Math.sin(angle) * distance;

        setPosition({ x: boundedX, y: boundedY });

        // Calculate angle in degrees (0-360)
        const angleDegrees = (angle * 180 / Math.PI + 360) % 360;
        const magnitude = (distance / centerX) * 100;

        setCurrentAngle(Math.round(angleDegrees));

        // Send command if joystick is moved significantly
        if (magnitude > 20) {
            sendCameraMountCommand(angleDegrees, magnitude);
        }
    };

    const sendCameraMountCommand = async (angle, magnitude) => {
        // Debounce: only send if angle changed significantly
        const roundedAngle = Math.round(angle / 10) * 10; // Round to nearest 10 degrees
        
        if (lastSentAngleRef.current === roundedAngle) {
            return;
        }
        
        lastSentAngleRef.current = roundedAngle;

        try {
            await axios.post('/api/camera-mount', {
                action: 'move',
                angle: angle,
                magnitude: magnitude
            });
            console.log(`Camera mount command sent: angle=${Math.round(angle)}°, magnitude=${Math.round(magnitude)}%`);
        } catch (error) {
            console.error('Failed to send camera mount command:', error);
        }
    };

    const centerCamera = async () => {
        try {
            await axios.post('/api/camera-mount', {
                action: 'center'
            });
            console.log('Camera centered');
        } catch (error) {
            console.error('Failed to center camera:', error);
        }
    };

    // Add event listeners
    useEffect(() => {
        const joystick = joystickRef.current;
        if (!joystick) return;

        joystick.addEventListener("mousedown", handleTouchStart);
        joystick.addEventListener("touchstart", handleTouchStart);

        joystick.addEventListener("mousemove", handleTouchMove);
        joystick.addEventListener("touchmove", handleTouchMove, { passive: false });

        joystick.addEventListener("mouseup", handleTouchEnd);
        joystick.addEventListener("touchend", handleTouchEnd);

        return () => {
            joystick.removeEventListener("mousedown", handleTouchStart);
            joystick.removeEventListener("touchstart", handleTouchStart);

            joystick.removeEventListener("mousemove", handleTouchMove);
            joystick.removeEventListener("touchmove", handleTouchMove);

            joystick.removeEventListener("mouseup", handleTouchEnd);
            joystick.removeEventListener("touchend", handleTouchEnd);
        };
    }, [isDragging]);

    return (
        <div className="camera-mount-joystick-container flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-white font-semibold text-sm">Camera Mount Control</h3>
            
            <div className="flex flex-col items-center gap-2">
                {/* Direction indicator */}
                {currentAngle !== null && (
                    <div className="text-xs text-gray-300">
                        {currentAngle >= 260 && currentAngle <= 280 ? '↑ Tilt Up' :
                         currentAngle >= 80 && currentAngle <= 100 ? '↓ Tilt Down' :
                         currentAngle >= 170 && currentAngle <= 190 ? '← Pan Left' :
                         currentAngle <= 10 || currentAngle >= 350 ? '→ Pan Right' :
                         `${Math.round(currentAngle)}°`}
                    </div>
                )}

                {/* Joystick */}
                <div
                    ref={joystickRef}
                    className="relative w-[120px] h-[120px] rounded-full bg-gray-700 border-2 border-gray-500 touch-none cursor-pointer shadow-inner"
                >
                    <div
                        className={`absolute w-[35px] h-[35px] rounded-full bg-orange-500 left-1/2 top-1/2 
                        transition-transform ${isDragging ? "transition-none" : "duration-200 ease-in-out"}
                        shadow-md before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-t before:from-orange-600/40 before:to-transparent`}
                        style={{
                            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                        }}
                    />
                    
                    {/* Center dot */}
                    <div className="absolute w-2 h-2 bg-gray-500 rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Center button */}
                <button
                    onClick={centerCamera}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors shadow-md"
                >
                    Center Camera
                </button>

                {/* Instructions */}
                <div className="text-xs text-gray-400 text-center max-w-[150px]">
                    Drag joystick to move camera. Up/Down controls tilt, Left/Right controls pan.
                </div>
            </div>
        </div>
    );
}

export default CameraMountJoystick;
