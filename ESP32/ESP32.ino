#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>

// Wi-Fi credentials
const char *ssid = "PTCL-LQSAH-2.4G";
const char *password = "Qam450Storm";

const char *mqttServer = "192.168.100.14";
const int mqttPort = 1883;
const char *mqttUser = "";
const char *mqttPassword = "";
const char *clientId = "ESP32_Client";
WiFiClient espClient;
PubSubClient client(espClient);

// MQTT topics
const char *statusTopic = "robot/status";
const char *sensorTopic = "robot/sensor_data";
const char *locomotionTopic = "robot/locomotion";
const char *calibrationTopic = "robot/calibration";
const char *calibrationFeedbackTopic = "robot/calibration/feedback";

// Robot status
bool isOnline = false;

// BMP280 readings timing
float referencePressure = 101325.0;  // Pa, will be updated at calibration
const unsigned long interval = 1000;  // 1 second
unsigned long lastPublish = 0;

// Motor Encoder
volatile long encoderCountLeft = 0;
volatile long encoderCountRight = 0;
const int encoderPinLeftA = 35;
const int encoderPinLeftB = 32;
const int encoderPinRightA = 33;
const int encoderPinRightB = 25;
long lastCountLeft = 0;
long lastCountRight = 0;
unsigned long lastTime = 0;

// PID Constants
float Kp = 1.0, Ki = 0.5, Kd = 0.1;
float targetRPM = 30.0;
float errorL = 0, integralL = 0, prevErrorL = 0;
float errorR = 0, integralR = 0, prevErrorR = 0;
int pwmL = 0, pwmR = 0;

// Inplace rotation, encoder ticks
float robot_base_circumference_cm = 0 float wheel_circumference_cm = 0 float ticksPerFullTurn = (robot_base_circumference_cm / wheel_circumference_cm) * 6400 float ticksPerDegree = ticksPerFullTurn / 360 long initialLeft = encoderCountLeft;
long initialRight = encoderCountRight;

// BMP280 sensor
Adafruit_BMP280 bmp;  // I2C interface

#define ENA 19  // Left wheel speed
#define IN1 18  // Left wheel forward
#define IN2 5   // Left wheel reverse
#define IN3 15  // Right wheel reverse
#define IN4 2   // Right wheel forward
#define ENB 4   // Right wheel speed
#define HEADLIGHT_PIN 34
#define HORN_PIN 23

void forward(int speed = 255) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  applyPIDControl(speed, speed)
}

void backward(int speed = 255) {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  applyPIDControl(speed, speed)
}

void turnLeft(int speed = 255) {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  applyPIDControl(0, speed)
}

void turnRight(int speed = 255) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  applyPIDControl(speed, 0)
}

void rotateLeft(int speed = 255) {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  applyPIDControl(speed, speed)
}

void rotateRight(int speed = 255) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  applyPIDControl(speed, speed)
}

void stop() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  applyPIDControl(0, 0)
}

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  pinMode(encoderPinLeftA, INPUT);
  pinMode(encoderPinLeftB, INPUT);
  attachInterrupt(digitalPinToInterrupt(encoderPinLeftA), updateLeftEncoder, CHANGE);

  pinMode(encoderPinRightA, INPUT);
  pinMode(encoderPinRightB, INPUT);
  attachInterrupt(digitalPinToInterrupt(encoderPinRightA), updateRightEncoder, CHANGE);

  Serial.begin(9600);
  delay(1000);
  Serial.println(F("BMP280 MQTT Test"));

  Wire.begin();

  if (!bmp.begin(0x77)) {
    Serial.println(F("Could not find BMP280 sensor, check wiring!"));
    while (1)
      ;
  }

  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi");

  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);
  reconnect();
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");
    if (client.connect(clientId, mqttUser, mqttPassword, statusTopic, 0, true, "offline")) {
      Serial.println("Connected");
      client.subscribe(locomotionTopic);
      client.subscribe(calibrationTopic);
      client.publish(statusTopic, "online", true);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 3 seconds");
      delay(3000);
    }
  }
}

void calibrateSensor(const char *quantity) {
  StaticJsonDocument<200> feedback;

  if (strcmp(quantity, "altitude") == 0) {
    const int numReadings = 10;
    float pressureSum = 0;

    for (int i = 0; i < numReadings; i++) {
      pressureSum += bmp.readPressure();  // in Pa
      delay(100);
    }

    referencePressure = pressureSum / numReadings;

    feedback["status"] = "success";
    feedback["quantity"] = quantity;
    feedback["referencePressure"] = referencePressure;
    feedback["message"] = "Calibrated: current location is now 0m altitude";
  } else {
    feedback["status"] = "failure";
    feedback["error"] = "unknown_quantity";
  }

  char buffer[200];
  serializeJson(feedback, buffer);
  client.publish(calibrationFeedbackTopic, buffer);
  Serial.print("Calibration feedback sent: ");
  Serial.println(buffer);
}

void applyPIDControl(float targetRPM_L, float targetRPM_R) {
  // Compute RPMs
  long countNowLeft = encoderCountLeft;
  long countNowRight = encoderCountRight;

  long diffLeft = countNowLeft - lastCountLeft;
  long diffRight = countNowRight - lastCountRight;

  float rpmLeft = (diffLeft / 6400.0) * 600.0;
  float rpmRight = (diffRight / 6400.0) * 600.0;

  // PID for Left
  errorL = targetRPM_L - rpmLeft;
  integralL += errorL;
  float derivativeL = errorL - prevErrorL;
  float outputL = Kp * errorL + Ki * integralL + Kd * derivativeL;
  pwmL = constrain(pwmL + outputL, 0, 255);
  prevErrorL = errorL;

  // PID for Right
  errorR = targetRPM_R - rpmRight;
  integralR += errorR;
  float derivativeR = errorR - prevErrorR;
  float outputR = Kp * errorR + Ki * integralR + Kd * derivativeR;
  pwmR = constrain(pwmR + outputR, 0, 255);
  prevErrorR = errorR;

  analogWrite(ENA, pwmL);  // apply left PWM
  analogWrite(ENB, pwmR);  // apply right PWM

  lastCountLeft = countNowLeft;
  lastCountRight = countNowRight;
}

void inplaceRotation(const int *angle, const char *direction) {
  int targetTicks = ticksPerDegree * angle;
  while (abs(encoderCountLeft - initialLeft) < targetTicks && abs(encoderCountRight - initialRight) < targetTicks) {
    if (strcmp(direction, "clockwise") == 0) {
      rotateRight();
    } else if (strcmp(direction, "anticlockwise") == 0) {
      rotateLeft();
    }
  }
  stop();
}

void moveDistance(float distance_cm) {
  int targetTicks = (distance_cm / wheel_circumference) * 6400;

  while (abs(encoderCountLeft - initialLeft) < targetTicks && abs(encoderCountRight - initialRight) < targetTicks) {
    forward();
  }
  stop();
}

void callback(char *topic, byte *payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Received command: ");
  Serial.println(message);

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  // const char *value = doc["value"] | "";  // Extract value, default to empty string

  if (strcmp(topic, locomotionTopic) == 0) {
    const char *action = doc["action"];
    int speed = doc["speed"] | 0;
    int angle = doc["angle"] | 0;
    int distance = doc["direction"] | 0;
    int distance = doc["distance"] | 0;
    const char *mode = doc["mode"] | "manual";
    int adjustedSpeed = speed;  // Adjust as per your scaling logic (0-255 for PWM)
    Serial.print("Action: ");
    Serial.print(action);
    Serial.print(" Speed: ");
    Serial.print(speed);
    Serial.print(" Angle: ");
    Serial.print(angle);
    Serial.print(" Mode: ");
    Serial.println(mode);
    if (strcmp(action, "move") == 0) {
      if (strcmp(type, "speed") == 0) {
        // Map angle to movement commands
        if (speed == 80) {
          Serial.println("Stopping");
          stop();
        }
        if (angle >= 80 && angle <= 100) {  // Forward (around 90°)
          Serial.println("Moving Forward");
          forward(adjustedSpeed);
        } else if (angle >= 260 && angle <= 280) {  // Backward (around 270°)
          Serial.println("Moving Backward");
          backward(adjustedSpeed);
        } else if (angle >= 350 && angle <= 10) {  // Right (around 0°/360°)
          Serial.println("Turning Right");
          turnRight(adjustedSpeed, adjustedSpeed);
        } else if (angle >= 170 && angle <= 190) {  // Left (around 180°)
          Serial.println("Turning Left");
          turnLeft(adjustedSpeed, adjustedSpeed);
        } else if (angle > 10 && angle < 80) {  // Rotate Right (between 0° and 90°)
          Serial.println("Rotating Right");
          rotateRight(adjustedSpeed, adjustedSpeed);
        } else if (angle > 280 && angle < 350) {  // Rotate Left (between 270° and 360°)
          Serial.println("Rotating Left");
          rotateLeft(adjustedSpeed, adjustedSpeed);
        } else {
          Serial.println("Unknown angle or value, stopping");
          stop();
        }
      } else if (strcmp(type, "angled_distance") == 0) {
        inplaceRotation(angle, direction)
          forward()
      }
      // } else if (strcmp(topic, "headlights") == 0) {
      //   Serial.print("Headlights: ");
      //   Serial.println(value);
      //   digitalWrite(HEADLIGHT_PIN, strcmp(value, "on") == 0 ? HIGH : LOW);
      // } else if (strcmp(topic, "horn") == 0) {
      //   Serial.print("Horn: ");
      //   Serial.println(value);
      //   digitalWrite(HORN_PIN, strcmp(value, "on") == 0 ? HIGH : LOW);
      // } else if (strcmp(topic, "mode") == 0) {
      //   Serial.print("Modetopic changed: ");
      //   Serial.println(value);
      //   // Handle mode change if needed
      // } else if (strcmp(topic, "screen") == 0) {
      //   Serial.print("Screen: ");
      //   Serial.println(value);
      //   // Handle screen command if needed
    } else if (strcmp(topic, calibrationTopic) == 0) {
      const char *quantity = doc["quantity"] | "";
      Serial.print("Calibrating quantity: ");
      Serial.print(quantity);
      calibrateSensor(quantity);
    }
  }

  void loop() {
    if (!client.connected()) {
      isOnline = false;
      reconnect();
    }
    client.loop();

    unsigned long now = millis();
    if (now - lastPublish >= interval) {
      lastPublish = now;

      float temperature = bmp.readTemperature();
      float currentPressure = bmp.readPressure();  // in Pa
      float relativeRawAltitude = 44330.0 * (1.0 - pow(currentPressure / referencePressure, 0.1903));
      float relativeRoundedAltitude = round(relativeRawAltitude * 10.0) / 10.0;
      if (abs(relativeRoundedAltitude) > -1) {
        relativeRoundedAltitude = 0.0;
      }

      // Motor Encoder
      unsigned long now = millis();
      if (now - lastTime >= 100) {
        long countNowLeft = encoderCountLeft;
        long countDiffLeft = countNowLeft - lastCountLeft;
        float rpmLeft = (countDiffLeft / 6400.0) * 600.0;  // ticks per 100ms to RPM

        long countNowRight = encoderCountRight;
        long countDiffRight = countNowRight - lastCountRight;
        float rpmRight = (countDiffRight / 6400.0) * 600.0;

        // PID for Left
        errorL = targetRPM - rpmLeft;
        integralL += errorL;
        float derivativeL = errorL - prevErrorL;
        float outputL = Kp * errorL + Ki * integralL + Kd * derivativeL;
        pwmL = constrain(pwmL + outputL, 0, 255);
        prevErrorL = errorL;

        // PID for Right
        errorR = targetRPM - rpmRight;
        integralR += errorR;
        float derivativeR = errorR - prevErrorR;
        float outputR = Kp * errorR + Ki * integralR + Kd * derivativeR;
        pwmR = constrain(pwmR + outputR, 0, 255);
        prevErrorR = errorR;

        analogWrite(ENA, pwmL);  // Left Motor PWM
        analogWrite(ENB, pwmR);  // Right Motor PWM

        lastCountLeft = countNowLeft;
        lastCountRight = countNowRight;
        lastTime = now;
      }

      StaticJsonDocument<300> doc;  // Adjust size as needed
      doc["temperature"] = temperature;
      doc["pressure"] = currentPressure;
      doc["altitude"] = relativeRoundedAltitude;

      JsonObject motor_status = doc.createNestedObject("motor_status");
      JsonObject motorLeft = motor_status.createNestedObject("Left Motor");
      motorLeft["Pulses/sec"] = countDiffLeft;
      motorLeft["RPM"] = rpmLeft;
      JsonObject motorRight = motor_status.createNestedObject("Right Motor");
      motorRight["Pulses/sec"] = countDiffRight;
      motorRight["RPM"] = rpmRight;

      char payload[300];
      serializeJson(doc, payload);
      client.publish(sensorTopic, payload);
    }
    // if (client.publish(sensorTopic, payload)) {
    //   Serial.println("Published: " + String(payload));
    // } else {
    //   Serial.println("Publish failed");
    // }
  }
}
void updateLeftEncoder() {
  bool A = digitalRead(encoderPinLeftA);
  bool B = digitalRead(encoderPinLeftB);
  if (A == B)
    encoderCountLeft++;
  else
    encoderCountLeft--;
}

void updateRightEncoder() {
  bool A = digitalRead(encoderPinRightA);
  bool B = digitalRead(encoderPinRightB);
  if (A == B)
    encoderCountRight++;
  else
    encoderCountRight--;
}
