from flask import Flask, Response, jsonify, request
import subprocess
import os
import time
import threading
from flask_cors import CORS
from config.robot_config import RobotConfig

app = Flask(__name__)
CORS(app)


# ========== CONFIGURABLE SETTINGS ==========
class CameraController:
    def __init__(self, config):
        self.config = config.CAMERA_CONFIG
        self.streaming = False
        self.frame_data = None
        self.frame_lock = threading.Lock()

    def capture_frame(self):
        """Capture a single frame with current settings"""
        timestamp = int(time.time() * 1000)
        filename = f"/tmp/frame_{timestamp}.jpg"

        try:
            # Build command based on settings
            cmd = [
                "libcamera-jpeg",
                "-o",
                filename,
                "--width",
                str(self.config["stream_width"]),
                "--height",
                str(self.config["stream_height"]),
                "--quality",
                str(self.config["stream_quality"]),
                "--timeout",
                str(self.config["capture_timeout"]),
            ]

            # Add optional settings
            if self.config["shutter_speed"]:
                cmd.extend(["--shutter", str(self.config["shutter_speed"])])
            if self.config["analog_gain"]:
                cmd.extend(["--gain", str(self.config["analog_gain"])])
            if self.config["brightness"] != 0.0:
                cmd.extend(["--brightness", str(self.config["brightness"])])

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=2)

            if result.returncode == 0 and os.path.exists(filename):
                with open(filename, "rb") as f:
                    with self.frame_lock:
                        self.frame_data = f.read()
                os.remove(filename)
                return True
            return False

        except Exception as e:
            print(f"Frame capture error: {e}")
            return False

    def frame_generator(self):
        """Generate MJPEG frames with configurable FPS"""
        frame_interval = 1.0 / self.config["target_fps"]

        while self.streaming:
            start_time = time.time()

            if self.capture_frame():
                with self.frame_lock:
                    if self.frame_data:
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n"
                            + self.frame_data
                            + b"\r\n"
                        )

            # Control frame rate precisely
            elapsed = time.time() - start_time
            sleep_time = max(0, frame_interval - elapsed)
            time.sleep(sleep_time)

    def video_feed(self):
        """MJPEG video stream endpoint"""
        self.streaming = True
        print(
            f"🎥 Starting stream: {self.config['stream_width']}x{self.config['stream_height']} at {self.config['target_fps']}FPS"
        )

        return Response(
            self.frame_generator(), mimetype="multipart/x-mixed-replace; boundary=frame"
        )

    def stop_stream(self):
        """Stop the camera stream"""
        self.streaming = False
        return jsonify({"status": "stopped", "message": "Stream stopped"})

    def camera_status(self):
        """Check camera status and current settings"""
        try:
            test_result = subprocess.run(
                ["libcamera-hello", "--list-cameras"],
                capture_output=True,
                text=True,
                timeout=5,
            )

            if test_result.returncode == 0:
                return jsonify(
                    {
                        "status": "connected",
                        "message": "Camera is ready",
                        "streaming": self.streaming,
                        "settings": {
                            "fps": self.config["target_fps"],
                            "resolution": f"{self.config['stream_width']}x{self.config['stream_height']}",
                            "quality": self.config["stream_quality"],
                            "capture_timeout": self.config["capture_timeout"],
                        },
                        "camera_type": "ov5647",
                    }
                )
            else:
                return jsonify({"status": "error", "message": "Camera not available"})
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)})

    def capture_single_image(self):
        """Capture a single high-quality image"""
        timestamp = int(time.time())
        filename = f"/tmp/capture_{timestamp}.jpg"

        try:
            # Use high quality settings for single capture
            cmd = [
                "libcamera-jpeg",
                "-o",
                filename,
                "--width",
                str(self.config["capture_width"]),
                "--height",
                str(self.config["capture_height"]),
                "--quality",
                str(self.config["capture_quality"]),
                "--timeout",
                str(self.config["capture_timeout_single"]),
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

            if result.returncode == 0 and os.path.exists(filename):
                with open(filename, "rb") as f:
                    image_data = f.read()
                os.remove(filename)
                return Response(image_data, mimetype="image/jpeg")
            else:
                return jsonify({"error": "Capture failed"}), 500

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def update_settings(self):
        """Update camera settings dynamically"""
        try:
            data = request.json

            # Update stream settings
            if "fps" in data:
                self.config["target_fps"] = max(
                    1, min(30, data["fps"])
                )  # Limit 1-30 FPS
            if "width" in data and "height" in data:
                self.config["stream_width"] = data["width"]
                self.config["stream_height"] = data["height"]
            if "quality" in data:
                self.config["stream_quality"] = max(1, min(100, data["quality"]))

            return jsonify(
                {
                    "status": "updated",
                    "new_settings": {
                        "fps": self.config["target_fps"],
                        "resolution": f"{self.config['stream_width']}x{self.config['stream_height']}",
                        "quality": self.config["stream_quality"],
                    },
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500


camera_controller = CameraController(RobotConfig)


# Define routes at module level
@app.route("/api/camera/stream")
def video_feed():
    return camera_controller.video_feed()


@app.route("/api/camera/status")
def camera_status():
    return camera_controller.camera_status()


@app.route("/api/camera/capture")
def capture_single_image():
    return camera_controller.capture_single_image()


@app.route("/api/camera/stream/update", methods=["POST"])
def update_settings():
    return camera_controller.update_settings()


@app.route("/api/camera/stop")
def stop_stream():
    return camera_controller.stop_stream()


if __name__ == "__main__":
    print("🚀 Starting Configurable MJPEG Camera Server...")
    print("🌐 Endpoints:")
    print("   GET  /api/camera/stream - Start video stream")
    print("   GET  /api/camera/stop - Stop stream")
    print("   GET  /api/camera/capture - Single high-quality image")
    print("   GET  /api/camera/settings - View current settings")
    print("   POST /api/camera/settings/update - Update settings")

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
