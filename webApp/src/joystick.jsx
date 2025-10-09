import React from "react";
import Joystick from "react-joystick-component";
// import "react-nipple/lib/styles.css";

function JoystickControl({ onMove,onEnd }) {
    return (
        <div style={{ width: "200px", height: "200px"}}>
            <Joystick
                options={{
                    mode: 'static',
                    position: { top: '50%', left: '50%' },
                    color: 'blue',
                    size: 100
                }}
                style={{
                    width: '100%', height: '100%', position: 'relative', touchAction: "none", // mobile-friendly
                }}

                onMove={(evt, data) => {
                    if (data.distance && data.angle) {
                        onMove({
                            // direction: data.direction.angle,
                            distance: data.distance*2.55,
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
