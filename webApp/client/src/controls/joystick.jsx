import React from "react";
import Joystick from "react-nipple";
import "react-nipple/lib/styles.css";

function JoystickControl({ onMove, onEnd }) {
    const visualSize = 100; // small visible joystick
    const virtualMaxDistance = 50; // for full-range scaling
    const outputMax = 100;
    return (
        <div style={{ width: visualSize, height: visualSize }}>
            <Joystick
                options={{
                    mode: "static",
                    position: { top: "50%", left: "50%" },
                    color: "blue",
                    size: visualSize,
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    touchAction: "none",
                }}

                onMove={(evt, data) => {
                    if (data.distance && data.angle) {
                        // console.log(data.distance)
                        const scaledValue = Math.min(
                            Math.round((data.distance / virtualMaxDistance) * outputMax),
                            outputMax
                        );
                        console.log(scaledValue)
                        onMove({
                            speed: scaledValue,
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
