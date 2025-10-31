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
            style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                backgroundColor: "#f0f0f0",
                border: "2px solid #ccc",
                position: "relative",
                touchAction: "none",
                cursor: "pointer"
            }}
        >
            <div
                style={{
                    position: "absolute",
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    backgroundColor: "blue",
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                    transition: isDragging ? "none" : "transform 0.2s ease"
                }}
            />
        </div>
    );
}

export default JoystickControl;