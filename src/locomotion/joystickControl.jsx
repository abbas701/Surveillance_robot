import React, { useRef, useState, useEffect } from "react";

function JoystickControl({ onMove, onEnd }) {
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
            // console.log((distance / centerX))
            //     console.log(import.meta.env.VITE_MOTOR_MAX_SPEED);
            onMove({
                distance: (distance / centerX) * 255,
                angle: (angle * 180 / Math.PI + 360) % 360
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
        <div
            ref={joystickRef}
            className="relative w-[100px] h-[100px] rounded-full bg-[#f0f0f0] border-2 border-[#ccc] touch-none cursor-pointer shadow-inner"
        >
            <div
                className={`absolute w-[30px] h-[30px] rounded-full bg-blue-500 left-1/2 top-1/2 
      transition-transform ${isDragging ? "transition-none" : "duration-200 ease-in-out"}
      shadow-md before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-t before:from-blue-600/40 before:to-transparent`}
                style={{
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                }}
            />
        </div>

    );
}

export default JoystickControl;