from flask import Flask, Response, jsonify, request
import subprocess
import os
import sys
import time
import threading
from flask_cors import CORS

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.robot_config import RobotConfig

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])


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
                "rpicam-jpeg",
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
        frame_count = 0

        print(f"🔄 Starting frame generator (streaming: {self.streaming})")
        
        while self.streaming:
            start_time = time.time()
            frame_count += 1

            if self.capture_frame():
                with self.frame_lock:
                    if self.frame_data:
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n"
                            + self.frame_data
                            + b"\r\n"
                        )
            else:
                print(f"❌ Frame {frame_count} capture failed")
                # If capture fails multiple times, break to avoid infinite loop
                if frame_count > 10:  # After 10 failed frames
                    print("🛑 Too many failed frames, stopping stream")
                    self.streaming = False
                    break

            # Control frame rate precisely
            elapsed = time.time() - start_time
            sleep_time = max(0, frame_interval - elapsed)
            time.sleep(sleep_time)
        
        print(f"🛑 Frame generator stopped after {frame_count} frames")

    def video_feed(self):
        """MJPEG video stream endpoint"""
        # Reset and start fresh each time
        print(f"🔍 DEBUG: video_feed called, streaming={self.streaming}")
        self.streaming = True
        print(f"🔍 DEBUG: streaming set to {self.streaming}")
        print(
            f"🎥 Starting NEW stream: {self.config['stream_width']}x{self.config['stream_height']} at {self.config['target_fps']}FPS"
        )

        return Response(
            self.frame_generator(), 
            mimetype="multipart/x-mixed-replace; boundary=frame"
        )

    def stop_stream(self):
        """Stop the camera stream"""
        self.streaming = False
        time.sleep(0.5)
        print("✅ Stream stopped completely")
        return jsonify({"status": "stopped", "message": "Stream stopped"})

    def camera_status(self):
        """Check camera status and current settings"""
        try:
            test_result = subprocess.run(
                ["rpicam-hello", "--list-cameras"],
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
        
        print(f"🔍 DEBUG: Available config keys: {list(self.config.keys())}")  # ← ADD THIS
        print(f"🔍 DEBUG: Looking for capture_width: {'capture_width' in self.config}")  # ← ADD THIS
        timestamp = int(time.time())
        filename = f"/tmp/capture_{timestamp}.jpg"

        try:
            print(f"📸 Attempting to capture image with command...")

            # Use high quality settings for single capture
            cmd = [
                "rpicam-jpeg",
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

            print(f"Running command: {' '.join(cmd)}")

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)

            print(f"Command result: returncode={result.returncode}")
            if result.stderr:
                print(f"Command stderr: {result.stderr}")

            if result.returncode == 0 and os.path.exists(filename):
                file_size = os.path.getsize(filename)
                print(f"✓ Image captured successfully: {filename} ({file_size} bytes)")
                with open(filename, "rb") as f:
                    image_data = f.read()
                os.remove(filename)
                return Response(image_data, mimetype="image/jpeg")
            else:
                print(
                    f"✗ Capture failed: returncode={result.returncode}, file_exists={os.path.exists(filename)}"
                )
                return jsonify({"error": f"Capture failed: {result.stderr}"}), 500

        except subprocess.TimeoutExpired:
            print("❌ Capture timeout - camera may be busy or disconnected")
            return jsonify({"error": "Capture timeout - check camera connection"}), 500
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
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
@app.route("/api/camera/stream/start")
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

@app.route("/api/camera/stream/stop")
def stop_stream():
    return camera_controller.stop_stream()


if __name__ == "__main__":
    print("🚀 Starting Configurable MJPEG Camera Server...")
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)  # ← debug=True
    print("🌐 Endpoints:")
    print("   GET  /api/camera/stream - Start video stream")
    print("   GET  /api/camera/stop - Stop stream")
    print("   GET  /api/camera/capture - Single high-quality image")
    print("   GET  /api/camera/settings - View current settings")
    print("   POST /api/camera/settings/update - Update settings")

    # app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
