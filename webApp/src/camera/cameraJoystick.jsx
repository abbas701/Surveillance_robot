import React, { useRef, useState, useEffect } from "react";

function CameraJoystick({ onMove, onEnd }) {
    const joystickRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

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
        
        if (onEnd) onEnd();
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

        if (onMove) {
            onMove({
                x: boundedX / centerX,
                y: boundedY / centerY
            });
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

        // Also handle mouse leaving the joystick area
        joystick.addEventListener("mouseleave", () => {
            if (isDragging) handleTouchEnd();
        });

        return () => {
            joystick.removeEventListener("mousedown", handleTouchStart);
            joystick.removeEventListener("touchstart", handleTouchStart);

            joystick.removeEventListener("mousemove", handleTouchMove);
            joystick.removeEventListener("touchmove", handleTouchMove);

            joystick.removeEventListener("mouseup", handleTouchEnd);
            joystick.removeEventListener("touchend", handleTouchEnd);
            joystick.removeEventListener("mouseleave", handleTouchEnd);
        };
    }, [isDragging]);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Camera Control
            </div>
            <div
                ref={joystickRef}
                className="relative w-[120px] h-[120px] rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 touch-none cursor-pointer shadow-lg"
            >
                {/* Crosshair guides */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[2px] bg-gray-300 dark:bg-gray-600 opacity-30"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[2px] h-full bg-gray-300 dark:bg-gray-600 opacity-30"></div>
                </div>
                
                {/* Joystick knob */}
                <div
                    className={`absolute w-[40px] h-[40px] rounded-full bg-gradient-to-br from-purple-500 to-purple-600 left-1/2 top-1/2 
                    transition-transform ${isDragging ? "transition-none shadow-xl scale-110" : "duration-200 ease-in-out shadow-md"}
                    border-2 border-white dark:border-gray-900`}
                    style={{
                        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                    }}
                >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/20 to-transparent"></div>
                </div>
                
                {/* Direction indicators */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">▲</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">▼</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">◀</div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 pointer-events-none">▶</div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Pan: {((position.x / 50) * 90).toFixed(0)}° | Tilt: {(-(position.y / 50) * 90).toFixed(0)}°
            </div>
        </div>
    );
}

export default CameraJoystick;
