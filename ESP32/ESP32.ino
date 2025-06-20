#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>

// ===================== CONFIG =====================
const char *ssid = "PTCL-LQSAH-2.4G";
const char *password = "Qam450Storm";

const char *mqttServer = "192.168.100.14";
const int mqttPort = 1883;
const char *mqttUser = "";
const char *mqttPassword = "";
const char *clientId = "ESP32_Client";

const char *statusTopic = "robot/status";
const char *sensorTopic = "robot/sensor_data";
const char *locomotionTopic = "robot/locomotion";
const char *calibrationTopic = "robot/calibration";
const char *calibrationFeedbackTopic = "robot/calibration/feedback";

#define ENA 19
#define IN1 18
#define IN2 5
#define IN3 15
#define IN4 2
#define ENB 4
#define HEADLIGHT_PIN 34
#define HORN_PIN 23

WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_BMP280 bmp;

// ===================== GLOBAL VARIABLES =====================
bool isOnline = false;

// Encoder pins and variables
volatile long encoderCountLeft = 0;
volatile long encoderCountRight = 0;
const int encoderPinLeftA = 35;
const int encoderPinLeftB = 32;
const int encoderPinRightA = 33;
const int encoderPinRightB = 25;

long lastCountLeft = 0, lastCountRight = 0;
unsigned long lastTime = 0, lastPublish = 0;

// PID control
float Kp = 1.0, Ki = 0.5, Kd = 0.1;
float targetRPM = 30.0;
float errorL = 0, integralL = 0, prevErrorL = 0;
float errorR = 0, integralR = 0, prevErrorR = 0;
int pwmL = 0, pwmR = 0;

// Movement + encoder math
float wheel_circumference_cm = 20.0;
float robot_base_circumference_cm = 47.1;
float ticksPerFullTurn = (robot_base_circumference_cm / wheel_circumference_cm) * 6400;
float ticksPerDegree = ticksPerFullTurn / 360.0;

// ===================== MOVEMENT FUNCTIONS =====================

void applyPIDControl(float targetRPM_L, float targetRPM_R) {
  long countNowLeft = encoderCountLeft;
  long countNowRight = encoderCountRight;

  long diffLeft = countNowLeft - lastCountLeft;
  long diffRight = countNowRight - lastCountRight;

  float rpmLeft = (diffLeft / 6400.0) * 600.0;
  float rpmRight = (diffRight / 6400.0) * 600.0;

  errorL = targetRPM_L - rpmLeft;
  integralL += errorL;
  float derivativeL = errorL - prevErrorL;
  float outputL = Kp * errorL + Ki * integralL + Kd * derivativeL;
  pwmL = constrain(pwmL + outputL, 0, 255);
  prevErrorL = errorL;

  errorR = targetRPM_R - rpmRight;
  integralR += errorR;
  float derivativeR = errorR - prevErrorR;
  float outputR = Kp * errorR + Ki * integralR + Kd * derivativeR;
  pwmR = constrain(pwmR + outputR, 0, 255);
  prevErrorR = errorR;

  analogWrite(ENA, pwmL);
  analogWrite(ENB, pwmR);

  lastCountLeft = countNowLeft;
  lastCountRight = countNowRight;
  lastTime = millis();
}

void forward(int speed = 255) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  applyPIDControl(speed, speed);
}

void backward(int speed = 255) {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  applyPIDControl(speed, speed);
}

void turnLeft(int speed = 255) {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  applyPIDControl(0, speed);
}

void turnRight(int speed = 255) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  applyPIDControl(speed, 0);
}

void rotateLeft(int speed = 255) {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  applyPIDControl(speed, speed);
}

void rotateRight(int speed = 255) {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  applyPIDControl(speed, speed);
}

void stop() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  applyPIDControl(0, 0);
}

void moveDistance(float distance_cm) {
  long initialLeft = encoderCountLeft;
  long initialRight = encoderCountRight;
  int targetTicks = (distance_cm / wheel_circumference_cm) * 6400;

  while (abs(encoderCountLeft - initialLeft) < targetTicks && abs(encoderCountRight - initialRight) < targetTicks) {
    forward(targetRPM);
  }
  stop();
}

void inplaceRotation(int angle, const char *direction) {
  long initialLeft = encoderCountLeft;
  long initialRight = encoderCountRight;
  int targetTicks = ticksPerDegree * angle;

  while (abs(encoderCountLeft - initialLeft) < targetTicks && abs(encoderCountRight - initialRight) < targetTicks) {
    if (strcmp(direction, "clockwise") == 0) rotateRight(targetRPM);
    else rotateLeft(targetRPM);
  }
  stop();
}

// ===================== ENCODER ISRs =====================
void IRAM_ATTR updateLeftEncoder() {
  bool A = digitalRead(encoderPinLeftA);
  bool B = digitalRead(encoderPinLeftB);
  encoderCountLeft += (A == B) ? 1 : -1;
}

void IRAM_ATTR updateRightEncoder() {
  bool A = digitalRead(encoderPinRightA);
  bool B = digitalRead(encoderPinRightB);
  encoderCountRight += (A == B) ? 1 : -1;
}

// ===================== MQTT + SENSOR =====================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    if (client.connect(clientId, mqttUser, mqttPassword, statusTopic, 0, true, "offline")) {
      Serial.println("Connected");
      client.subscribe(locomotionTopic);
      client.subscribe(calibrationTopic);
      client.publish(statusTopic, "online", true);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      delay(3000);
    }
  }
}

void calibrateSensor(const char *quantity) {
  StaticJsonDocument<200> feedback;
  if (strcmp(quantity, "altitude") == 0) {
    float pressureSum = 0;
    for (int i = 0; i < 10; i++) {
      pressureSum += bmp.readPressure();
      delay(100);
    }
    float referencePressure = pressureSum / 10;
    feedback["status"] = "success";
    feedback["referencePressure"] = referencePressure;
  } else {
    feedback["status"] = "failure";
    feedback["error"] = "unknown_quantity";
  }
  char buffer[200];
  serializeJson(feedback, buffer);
  client.publish(calibrationFeedbackTopic, buffer);
}

void callback(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<200> doc;
  String msg = String((char *)payload).substring(0, length);
  DeserializationError err = deserializeJson(doc, msg);
  if (err) return;

  if (strcmp(topic, locomotionTopic) == 0) {
    const char *action = doc["action"];
    int angle = doc["angle"] | 0;
    int distance = doc["distance"] | 0;
    int speed = doc["speed"] | targetRPM;
    const char *direction = doc["direction"] | "clockwise";
    const char *type = doc["type"] | "speed";

    if (strcmp(action, "move") == 0) {
      if (strcmp(type, "angled_distance") == 0) {
        inplaceRotation(angle, direction);
        moveDistance(distance);
      } else if (strcmp(type, "speed") == 0) {
        if (angle >= 80 && angle <= 100) forward(speed);
        else if (angle >= 260 && angle <= 280) backward(speed);
        else if (angle >= 350 || angle <= 10) turnRight(speed);
        else if (angle >= 170 && angle <= 190) turnLeft(speed);
        else if (angle > 10 && angle < 80) rotateRight(speed);
        else if (angle > 280 && angle < 350) rotateLeft(speed);
        else stop();
      }
    }
  } else if (strcmp(topic, calibrationTopic) == 0) {
    calibrateSensor(doc["quantity"]);
  }
}

// ===================== SETUP + LOOP =====================
void setup() {
  Serial.begin(9600);
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

  Wire.begin();
  if (!bmp.begin(0x77)) {
    Serial.println(F("Could not find BMP280!"));
    while (1)
      ;
  }
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected");

  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);
  reconnect();
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();
  if (now - lastPublish >= 1000) {
    lastPublish = now;
    float temperature = bmp.readTemperature();
    float pressure = bmp.readPressure();
    float altitude = 44330.0 * (1.0 - pow(pressure / 101325.0, 0.1903));

    StaticJsonDocument<300> doc;
    doc["temperature"] = temperature;
    doc["pressure"] = pressure;
    doc["altitude"] = round(altitude * 10.0) / 10.0;

    JsonObject motors = doc.createNestedObject("motor_status");
    motors["Left Motor"]["Pulses/sec"] = (encoderCountLeft - lastCountLeft);
    motors["Left Motor"]["RPM"] = (float)(encoderCountLeft - lastCountLeft) / 6400.0 * 600.0;
    motors["Right Motor"]["Pulses/sec"] = (encoderCountRight - lastCountRight);
    motors["Right Motor"]["RPM"] = (float)(encoderCountRight - lastCountRight) / 6400.0 * 600.0;

    lastCountLeft = encoderCountLeft;
    lastCountRight = encoderCountRight;

    char payload[300];
    serializeJson(doc, payload);
    client.publish(sensorTopic, payload);
  }
}
