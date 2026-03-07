#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* API_BASE_URL = "https://your-backend.example.com";
const char* DEVICE_ID = "esp8266-lab-01";

const int LIGHT_PIN = D1;
const int WATER_PIN = D2;

unsigned long lastPollMs = 0;
unsigned long lastStateMs = 0;

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

bool postJson(String path, String body, int& code, String& response) {
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();

  HTTPClient http;
  if (!http.begin(*client, String(API_BASE_URL) + path)) {
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  code = http.POST(body);
  response = http.getString();
  http.end();
  return true;
}

bool getJson(String path, int& code, String& response) {
  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();

  HTTPClient http;
  if (!http.begin(*client, String(API_BASE_URL) + path)) {
    return false;
  }
  code = http.GET();
  response = http.getString();
  http.end();
  return true;
}

void applyCommand(JsonObject command, DynamicJsonDocument& statePatch) {
  JsonObject payload = command["payload"];
  String relay = payload["relay"] | "";
  String state = payload["state"] | "";

  if (relay == "light") {
    digitalWrite(LIGHT_PIN, state == "on" ? HIGH : LOW);
    statePatch["light"] = state;
  } else if (relay == "water") {
    if (state == "start") {
      digitalWrite(WATER_PIN, HIGH);
      int durationSec = payload["wateringSeconds"] | 10;
      delay(durationSec * 1000);
      digitalWrite(WATER_PIN, LOW);
      statePatch["water"] = "done";
      statePatch["wateringSeconds"] = durationSec;
    } else {
      digitalWrite(WATER_PIN, LOW);
      statePatch["water"] = "off";
    }
  }
}

void ackCommand(const String& commandId, const String& status, DynamicJsonDocument& statePatch) {
  DynamicJsonDocument body(512);
  body["status"] = status;
  body["result"] = "processed by esp8266";
  body["statePatch"] = statePatch.as<JsonObject>();

  String payload;
  serializeJson(body, payload);

  int code = 0;
  String response;
  postJson(String("/api/devices/") + DEVICE_ID + "/commands/" + commandId + "/ack", payload, code, response);
}

void sendHeartbeat() {
  DynamicJsonDocument body(256);
  JsonObject state = body.createNestedObject("state");
  state["wifiRssi"] = WiFi.RSSI();
  state["lightPin"] = digitalRead(LIGHT_PIN);
  state["waterPin"] = digitalRead(WATER_PIN);

  String payload;
  serializeJson(body, payload);

  int code = 0;
  String response;
  postJson(String("/api/devices/") + DEVICE_ID + "/state", payload, code, response);
}

void pollNextCommand() {
  int code = 0;
  String response;
  if (!getJson(String("/api/devices/") + DEVICE_ID + "/commands/next", code, response)) {
    return;
  }
  if (code != 200) {
    return;
  }

  DynamicJsonDocument doc(1536);
  auto err = deserializeJson(doc, response);
  if (err) {
    return;
  }

  JsonObject command = doc["command"];
  if (command.isNull()) {
    return;
  }

  String commandId = command["commandId"] | "";
  if (commandId.length() == 0) {
    return;
  }

  DynamicJsonDocument statePatch(512);
  applyCommand(command, statePatch);
  ackCommand(commandId, "acked", statePatch);
}

void setup() {
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(WATER_PIN, OUTPUT);
  digitalWrite(LIGHT_PIN, LOW);
  digitalWrite(WATER_PIN, LOW);

  connectWifi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  unsigned long now = millis();
  if (now - lastPollMs >= 2000) {
    lastPollMs = now;
    pollNextCommand();
  }

  if (now - lastStateMs >= 15000) {
    lastStateMs = now;
    sendHeartbeat();
  }
}
