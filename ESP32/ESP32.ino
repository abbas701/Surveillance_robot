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
const char *sensorTopic = "robot/sensors";
const char *commandTopic = "robot/commands";

// Timing
const unsigned long interval = 1000; // 1 second
unsigned long lastPublish = 0;

// Motor Encoder
volatile long encoderCount = 0;
const int encoderPin1A = 35;
const int encoderPin1B = 32;
const int encoderPin2B = 33;
const int encoderPin2B = 25;
unsigned long lastTime = 0;
long lastCount = 0;

// BMP280 sensor
Adafruit_BMP280 bmp; // I2C interface

#define ENA 19 // Left wheel speed
#define IN1 18 // Left wheel forward
#define IN2 5  // Left wheel reverse
#define IN3 15 // Right wheel reverse
#define IN4 2  // Right wheel forward
#define ENB 4  // Right wheel speed
#define HEADLIGHT_PIN 34
#define HORN_PIN 23

void forward(int speedL, int speedR)
{
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, speedL);
  analogWrite(ENB, speedR);
}

void backward(int speedL, int speedR)
{
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, speedL);
  analogWrite(ENB, speedR);
}

void turnLeft(int speedL, int speedR)
{
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, speedL);
  analogWrite(ENB, speedR);
}

void turnRight(int speedL, int speedR)
{
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, speedL);
  analogWrite(ENB, speedR);
}

void rotateLeft(int speedL, int speedR)
{
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, speedL);
  analogWrite(ENB, speedR);
}

void rotateRight(int speedL, int speedR)
{
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, speedL);
  analogWrite(ENB, speedR);
}

void stop()
{
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
}

void setup()
{
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  pinMode(encoderPinA, INPUT);
  pinMode(encoderPinB, INPUT);
  attachInterrupt(digitalPinToInterrupt(encoderPinA), updateEncoder, CHANGE);

  Serial.begin(9600);
  delay(1000);
  Serial.println(F("BMP280 MQTT Test"));

  Wire.begin();

  if (!bmp.begin(0x77))
  {
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
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi");

  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);
  reconnect();
}

void reconnect()
{
  while (!client.connected())
  {
    Serial.print("Connecting to MQTT broker...");
    if (client.connect(clientId, mqttUser, mqttPassword))
    {
      Serial.println("Connected");
      client.subscribe(commandTopic);
    }
    else
    {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 seconds");
      delay(5000);
    }
  }
}

void callback(char *topic, byte *payload, unsigned int length)
{
  String message;
  for (unsigned int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }
  Serial.print("Received command: ");
  Serial.println(message);

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error)
  {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  const char *action = doc["action"];
  const char *value = doc["value"];
  int speed = doc["speed"] | 0;
  const char *mode = doc["mode"] | "manual";

  if (strcmp(action, "move") == 0)
  {
    Serial.print("Move: ");
    Serial.print(value);
    Serial.print(", Mode: ");
    Serial.println(mode);
    int adjustedSpeed = speed;
    if (strcmp(mode, "manual-precise") == 0)
    {
      adjustedSpeed = round(speed / 100 * 255); // Slower for precision
    }
    if (strcmp(value, "forward") == 0)
      forward(adjustedSpeed, adjustedSpeed);
    else if (strcmp(value, "backward") == 0)
      backward(adjustedSpeed, adjustedSpeed);
    else if (strcmp(value, "left") == 0)
      turnLeft(adjustedSpeed, adjustedSpeed);
    else if (strcmp(value, "right") == 0)
      turnRight(adjustedSpeed, adjustedSpeed);
    else if (strcmp(value, "rotate_left") == 0)
      rotateLeft(adjustedSpeed, adjustedSpeed);
    else if (strcmp(value, "rotate_right") == 0)
      rotateRight(adjustedSpeed, adjustedSpeed);
    else if (strcmp(value, "stop") == 0)
      stop();
  }
  else if (strcmp(action, "headlights") == 0)
  {
    Serial.print("Headlights: ");
    Serial.println(value);
    digitalWrite(HEADLIGHT_PIN, strcmp(value, "on") == 0 ? HIGH : LOW);
  }
  else if (strcmp(action, "horn") == 0)
  {
    Serial.print("Horn: ");
    Serial.println(value);
    digitalWrite(HORN_PIN, strcmp(value, "on") == 0 ? HIGH : LOW);
  }
  else if (strcmp(action, "mode") == 0)
  {
    Serial.print("Mode changed: ");
    Serial.println(value);
  }
  else if (strcmp(action, "screen") == 0)
  {
    Serial.print("Screen: ");
    Serial.println(value);
  }
}

void loop()
{
  if (!client.connected())
  {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastPublish >= interval)
  {
    lastPublish = now;

    float temperature = bmp.readTemperature();
    float pressure = bmp.readPressure() / 100.0F;
    float altitude = bmp.readAltitude(1000);

    StaticJsonDocument<200> doc;
    doc["temperature"] = temperature;
    doc["pressure"] = pressure;
    doc["altitude"] = altitude;

    char payload[200];
    serializeJson(doc, payload);

    if (client.publish(sensorTopic, payload))
    {
      Serial.println("Published: " + String(payload));
    }
    else
    {
      Serial.println("Publish failed");
    }

    // Motor Encoder
    unsigned long now = millis();
    if (now - lastTime >= 1000)
    { // Every 1 second
      long countNow = encoderCount;
      long countDiff = countNow - lastCount;

      float revs = countDiff / 6400.0; // revolutions
      float rpm = revs * 60.0;
      Serial.print("Pulses/sec: ");
      Serial.println(countDiff);
      Serial.print("RPM: ");
      Serial.println(rpm, 3); // Print 3 decimal places

      lastCount = countNow;
      lastTime = now;
    }
    // Serial.print("Temperature = ");
    // Serial.print(temperature, 2);
    // Serial.println(" *C");
    // Serial.print("Pressure = ");
    // Serial.print(pressure, 2);
    // Serial.println(" hPa");
    // Serial.print("Altitude = ");
    // Serial.print(altitude, 2);
    // Serial.println(" m");
  }
}
void updateEncoder()
{
  bool A = digitalRead(encoderPinA);
  bool B = digitalRead(encoderPinB);

  if (A == B)
  {
    encoderCount++;
  }
  else
  {
    encoderCount--;
  }
}