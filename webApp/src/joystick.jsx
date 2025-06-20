import React from "react";
import Joystick from "react-nipple";
import "react-nipple/lib/styles.css";

function JoystickControl({ onMove,onEnd }) {
    return (
        <div style={{ width: "200px", height: "200px"}}>
            <Joystick
                options={{
                    mode: 'static',
                    position: { top: '50%', left: '50%' },
                    color: 'blue',
                    size: 510
                }}
                style={{
                    width: '100%', height: '100%', position: 'relative', touchAction: "none", // mobile-friendly
                }}

                onMove={(evt, data) => {
                    if (data.distance && data.angle) {
                        onMove({
                            // direction: data.direction.angle,
                            distance: data.distance,
                            angle: data.angle.degree,
                        });
                    }
                }}
                onEnd={onEnd}
            />
        </div>
    );
}

export default JoystickControl;
