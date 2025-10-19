import paho.mqtt.client as mqtt
import time

def on_connect(client, userdata, flags, reason_code, properties):
    print(f"Connected with result code {reason_code}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="RPi_Test")
# Uncomment if ESP32 uses auth:
# client.username_pw_set("robot_user", "s3cr3t!")
client.on_connect = on_connect

try:
    client.connect("192.168.100.14", 1883, 60)
    client.loop_start()
    time.sleep(3)  # Wait for connection
    if client.is_connected():
        print("Success!")
    else:
        print("Failed to connect")
except Exception as e:
    print(f"Error: {e}")