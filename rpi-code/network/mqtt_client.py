import paho.mqtt.client as mqtt
import time
import json


class MQTTClient:
    def __init__(self, pi, config, robot):
        """Initialize MQTT client and callback"""
        self.pi = pi
        self.robot = robot
        self.gpio_config = config.GPIO_CONFIG
        self.mqtt_config = config.MQTT_CONFIG
        self.base_pwm = config.base_pwm
        self.mqtt_client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2, client_id="RPi_Test"
        )
        self.mqtt_client.username_pw_set("", "")
        self.mqtt_client.on_connect = self._on_mqtt_connect
        self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
        self.mqtt_client.on_message = self._on_mqtt_message

        # Add reconnection settings
        self.mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)

        self._mqtt_reconnect()

    def _mqtt_reconnect(self, max_retries=5, retry_delay=3):
        """Attempt MQTT reconnection"""
        retry_count = 0
        while retry_count < max_retries:
            try:
                print("Connecting to MQTT broker...")
                self.mqtt_client.connect(
                    self.mqtt_config["broker"], self.mqtt_config["port"], 60
                )
                self.mqtt_client.loop_start()

                # Wait a bit for connection to establish
                time.sleep(2)

                if self.mqtt_client.is_connected():
                    print("MQTT Connected!")
                    self.is_online = True
                    return True
                else:
                    print("MQTT connection attempt failed")

            except Exception as e:
                print(f"MQTT connection failed: {e}")

            retry_count += 1
            delay = min(retry_delay * (2**retry_count), 30)
            print(
                f"Retrying in {delay} seconds... (Attempt {retry_count}/{max_retries})"
            )
            time.sleep(delay)

        print("Failed to connect to MQTT broker after maximum retries")
        self.is_online = False
        return False

    def test_mqtt_publishing(self):
        """Test if MQTT publishing is working"""
        test_payload = {
            "test": True,
            "timestamp": time.time(),
            "message": "Test from robot",
        }
        try:
            result = self.mqtt_client.publish(
                self.mqtt_config["topics"]["sensor_data"], json.dumps(test_payload)
            )
            # Wait for publish to complete
            result.wait_for_publish(timeout=5)
            print(f"✓ Test MQTT publish: SUCCESS (mid: {result.mid})")
            return True
        except Exception as e:
            print(f"✗ Test MQTT publish: FAILED - {e}")
            return False

    def _on_mqtt_connect(self, client, userdata, flags, reason_code, properties):
        """MQTT connection callback"""
        if reason_code == 0:
            print(
                f"Successfully connected to MQTT broker with reason code {reason_code}"
            )
            client.subscribe(self.mqtt_config["topics"]["locomotion"])
            client.subscribe(self.mqtt_config["topics"]["calibration"])
            client.subscribe(self.mqtt_config["topics"]["camera_control"])
            client.publish(self.mqtt_config["topics"]["status"], "online", retain=True)
            self.is_online = True
            print("MQTT subscriptions set up and status published")
        else:
            print(f"Failed to connect to MQTT broker with reason code {reason_code}")
            self.is_online = False

    def _on_mqtt_disconnect(
        self, client, userdata, disconnect_flags, reason_code, properties
    ):
        """MQTT disconnection callback"""
        print(
            f"MQTT disconnected with reason code {reason_code}, flags: {disconnect_flags}"
        )
        self.is_online = False

        if reason_code != 0:
            print("Unexpected disconnection, attempting to reconnect...")
            time.sleep(5)
            self._mqtt_reconnect()

    def _on_mqtt_message(self, client, userdata, message):
        """Handle incoming MQTT messages"""
        try:
            payload = json.loads(message.payload.decode())
            print(f"Received MQTT message on {message.topic}: {payload}")

            if message.topic == self.mqtt_config["topics"]["locomotion"]:
                self._handle_locomotion_command(payload)

            elif message.topic == self.mqtt_config["topics"]["calibration"]:
                self._handle_calibration_command(payload)

            elif message.topic == self.mqtt_config["topics"]["camera_control"]:
                self._handle_camera_control_command(payload)

        except Exception as e:
            print(f"Error processing MQTT message: {e}")

    def publish_network_metrics(self, network_data):
        """Publish network metrics to MQTT"""
        if not self.mqtt_client.is_connected():
            print("MQTT not connected, skipping network publish")
            return
        
        try:
            result = self.mqtt_client.publish(
                self.mqtt_config["topics"]["network"], 
                json.dumps(network_data)
            )
            result.wait_for_publish(timeout=5)
            print(f"✓ Published network metrics (msg ID: {result.mid})")
        except Exception as e:
            print(f"✗ Failed to publish network metrics: {e}")

    def _handle_locomotion_command(self, command):
        """Process locomotion commands by updating robot state."""
        action = command.get("action", "")
        speed = command.get("speed", self.base_pwm)

        if action == "stop":
            self.robot.command = "stop"
            print("🛑 Command received: stop")
            return

        elif action == "move":
            angle = command.get("angle", 0)
            print(f"🎮 Move command received - Angle: {angle}, Speed: {speed}")
            self.robot.target_speed = speed
            if 260 <= angle <= 280:
                self.robot.command = "forward"
            elif 80 <= angle <= 100:
                self.robot.command = "backward"
            elif 170 <= angle <= 190:
                self.robot.command = "left"
            elif angle <= 10 or angle >= 350:
                self.robot.command = "right"
            else:
                self.robot.command = "stop"

        elif action == "horn":
            value = command.get("value", "")
            horn_value = bool(value)
            self.pi.write(self.gpio_config["misc"]["horn"], 1 if horn_value else 0)
            print(f"Horn: {'ON' if horn_value else 'OFF'}")

        elif action == "headlights":
            value = command.get("value", "")
            lights_value = bool(value)
            self.pi.write(
                self.gpio_config["misc"]["headlights"], 1 if lights_value else 0
            )
            print(f"Headlights: {'ON' if lights_value else 'OFF'}")

    def _handle_calibration_command(self, command):
        """Process calibration commands"""
        quantity = command.get("quantity", "")
        feedback = {"status": "failure", "error": "unknown_quantity"}

        if quantity == "altitude":
            pressure_sum = 0
            for _ in range(10):
                env_data = self._read_environmental()
                if env_data:
                    pressure_sum += env_data["pressure"]
                time.sleep(0.1)

            feedback = {"status": "success", "referencePressure": pressure_sum / 10}

        self.mqtt_client.publish(
            self.mqtt_config["topics"]["calibration_feedback"],
            json.dumps(feedback),
            retain=True,
        )

    def _handle_camera_control_command(self, command):
        """Process camera control commands"""
        try:
            action = command.get("action", "")
            
            if action == "move":
                # Joystick control - x and y values from -100 to +100
                x_value = command.get("x", 0)
                y_value = command.get("y", 0)
                
                # Convert to angles: x controls pan, y controls tilt
                # Joystick: x positive = right, y positive = up
                pan_angle = (x_value / 100.0) * 90  # -90 to +90 degrees
                tilt_angle = (y_value / 100.0) * 90  # -90 to +90 degrees
                
                # Set servo positions
                self.robot.servos.set_pan(pan_angle)
                self.robot.servos.set_tilt(tilt_angle)
                
                print(f"📹 Camera move: pan={pan_angle:.1f}°, tilt={tilt_angle:.1f}°")
                
            elif action == "center":
                # Center the camera
                self.robot.servos.center()
                print("📹 Camera centered")
                
            elif action == "pan":
                # Direct pan control
                angle = command.get("angle", 0)
                self.robot.servos.set_pan(angle)
                print(f"📹 Camera pan: {angle}°")
                
            elif action == "tilt":
                # Direct tilt control
                angle = command.get("angle", 0)
                self.robot.servos.set_tilt(angle)
                print(f"📹 Camera tilt: {angle}°")
                
        except Exception as e:
            print(f"❌ Error handling camera control command: {e}")

    def _publish_sensor_data(self, imu_data, env_data, battery_data,encoder_data):
        """Publish sensor data to MQTT"""
        if not self.mqtt_client.is_connected():  # Use direct check instead of is_online
            print("MQTT not connected, skipping publish")
            return

        try:
            payload = {
                "imu": imu_data if imu_data else {"error": "No IMU data"},
                "environment": env_data
                if env_data
                else {"error": "No environmental data"},
                "battery": battery_data
                if battery_data
                else {"error": "No battery data"},
                "encoders": encoder_data
                if encoder_data
                else {"error": "No encoder data"},
                "movement": self.robot.command,
                "timestamp": time.time(),
            }

            result = self.mqtt_client.publish(
                self.mqtt_config["topics"]["sensor_data"], json.dumps(payload)
            )

            # Optional: Wait for publish confirmation
            result.wait_for_publish(timeout=5)

            print(f"✓ Published sensor data to MQTT (msg ID: {result.mid})")

        except Exception as e:
            print(f"✗ Failed to publish sensor data: {e}")

    def disconnect(self):
        """Safely disconnect from MQTT broker"""
        try:
            if hasattr(self, 'mqtt_client') and self.mqtt_client:
                # Stop the network loop first
                self.mqtt_client.loop_stop()

                # Disconnect from broker
                if self.mqtt_client.is_connected():
                    self.mqtt_client.disconnect()
                    print("✓ MQTT client disconnected")
                else:
                    print("ℹ️ MQTT client already disconnected")
        except Exception as e:
            print(f"Error disconnecting MQTT: {e}")