import React, { useState, useEffect } from 'react';
import { CircuitComponent, Wire } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { Code2, Copy, Download, Sparkles, X, Check } from 'lucide-react';

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: CircuitComponent[];
  wires: Wire[];
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({ isOpen, onClose, components, wires }) => {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate Arduino code based on connected components & pins
  useEffect(() => {
    if (!isOpen) return;

    const uno = components.find(
      (c) =>
        c.type === 'arduino-uno' ||
        c.type === 'arduino-nano' ||
        c.type.startsWith('esp32') ||
        c.type.startsWith('wemos')
    );
    if (!uno) {
      setCode(`// Belum ada mikrokontroler (Arduino Nano / Uno / ESP32) di kanvas.
// Tambahkan mikrokontroler dari katalog untuk men-generate kode otomatis.

void setup() {
  Serial.begin(9600);
  Serial.println("WireCraft Ready!");
}

void loop() {
  // Masukkan kode perulangan di sini
}
`);
      return;
    }

    // Detect pins connected to Arduino
    const connectedToUno = wires.filter((w) => w.fromComponentId === uno.id || w.toComponentId === uno.id);

    let pinDeclarations: string[] = [];
    let setupLines: string[] = [];
    let loopLines: string[] = [];
    let includeLines: string[] = [];

    let hasServo = false;
    let hasUltrasonic = false;
    let hasLcd = false;
    let hasDht = false;
    let hasRfid = false;
    let hasOled = false;
    let hasBuzzer = false;
    let hasRtc = false;
    let hasTft = false;
    let hasKeypad = false;
    let is4x4 = false;
    let hasSoilMoisture = false;
    let hasMax31865 = false;
    let hasAds1115 = false;
    let hasLdr = false;
    let hasIrObstacle = false;
    let hasTouch = false;
    let hasVibration = false;

    // Scan connections
    connectedToUno.forEach((w) => {
      const isFrom = w.fromComponentId === uno.id;
      const unoPin = isFrom ? w.fromPinId : w.toPinId;
      const targetCompId = isFrom ? w.toComponentId : w.fromComponentId;
      const targetComp = components.find((c) => c.id === targetCompId);
      if (!targetComp || !unoPin) return;

      const pinUpper = unoPin.toUpperCase();

      if (targetComp.type === 'led') {
        pinDeclarations.push(`const int LED_PIN = ${pinUpper.replace('D', '')}; // Terhubung ke LED`);
        setupLines.push(`  pinMode(LED_PIN, OUTPUT);`);
        loopLines.push(`  digitalWrite(LED_PIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_PIN, LOW);\n  delay(1000);`);
      } else if (targetComp.type === 'sensor-ultrasonic' || targetComp.type === 'sensor-jsn-sr04t') {
        hasUltrasonic = true;
      } else if (targetComp.type === 'servo') {
        hasServo = true;
      } else if (
        targetComp.type === 'sensor-dht11' ||
        targetComp.type === 'sensor-dht22' ||
        targetComp.type === 'sensor-dht22-module'
      ) {
        hasDht = true;
      } else if (targetComp.type === 'sensor-rfid-rc522') {
        hasRfid = true;
      } else if (targetComp.type === 'sensor-soil-moisture') {
        hasSoilMoisture = true;
      } else if (targetComp.type.includes('max31865')) {
        hasMax31865 = true;
      } else if (targetComp.type === 'sensor-ads1115') {
        hasAds1115 = true;
      } else if (targetComp.type === 'sensor-ldr' || targetComp.type.includes('ldr')) {
        hasLdr = true;
      } else if (targetComp.type.includes('obstacle') || targetComp.type.includes('ir-obstacle')) {
        hasIrObstacle = true;
      } else if (targetComp.type === 'sensor-touch-ttp223') {
        hasTouch = true;
      } else if (targetComp.type.includes('vibration') || targetComp.type.includes('sw420')) {
        hasVibration = true;
      } else if (
        targetComp.type === 'display-lcd1602' ||
        targetComp.type === 'display-lcd1602-i2c' ||
        targetComp.type === 'display-lcd2004' ||
        targetComp.type === 'display-lcd2004-i2c'
      ) {
        hasLcd = true;
      } else if (targetComp.type === 'display-oled') {
        hasOled = true;
      } else if (targetComp.type === 'buzzer') {
        hasBuzzer = true;
      } else if (targetComp.type === 'rtc-ds3231') {
        hasRtc = true;
      } else if (targetComp.type === 'display-tft-28' || targetComp.type === 'display-tft-28-touch') {
        hasTft = true;
      } else if (targetComp.type === 'keypad-3x4') {
        hasKeypad = true;
      } else if (targetComp.type === 'keypad-4x4') {
        hasKeypad = true;
        is4x4 = true;
      } else if (targetComp.type === 'relay' || targetComp.type === 'relay-black' || targetComp.type === 'relay-red') {
        const pinNum = pinUpper.replace('D', '');
        pinDeclarations.push(`const int RELAY_PIN = ${pinNum}; // Pin Kontrol Relay`);
        setupLines.push(`  pinMode(RELAY_PIN, OUTPUT);`);
        loopLines.push(`  // Aktifkan Relay (ON)\n  digitalWrite(RELAY_PIN, HIGH);\n  delay(2000);\n  // Matikan Relay (OFF)\n  digitalWrite(RELAY_PIN, LOW);\n  delay(2000);`);
      }
    });

    if (hasServo) {
      includeLines.push('#include <Servo.h>');
      pinDeclarations.push('Servo myServo;');
      setupLines.push('  myServo.attach(9); // Pin Servo');
      loopLines.push('  myServo.write(90); // Gerak ke 90 derajat\n  delay(1000);');
    }

    if (hasDht) {
      includeLines.push('#include <DHT.h>');
      pinDeclarations.push('#define DHTPIN 2');
      pinDeclarations.push('#define DHTTYPE DHT22');
      pinDeclarations.push('DHT dht(DHTPIN, DHTTYPE);');
      setupLines.push('  dht.begin();');
      loopLines.push(`  float h = dht.readHumidity();\n  float t = dht.readTemperature();\n  Serial.print("Suhu: ");\n  Serial.print(t);\n  Serial.println(" C");\n  delay(2000);`);
    }

    if (hasLcd) {
      includeLines.push('#include <Wire.h>');
      includeLines.push('#include <LiquidCrystal_I2C.h>');
      pinDeclarations.push('LiquidCrystal_I2C lcd(0x27, 16, 2);');
      setupLines.push('  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Circuit Studio");');
    }

    if (hasUltrasonic) {
      pinDeclarations.push('const int TRIG_PIN = 9;\nconst int ECHO_PIN = 10;');
      setupLines.push('  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);');
      loopLines.push(`  // Pengukuran Jarak Ultrasonik
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distanceCm = duration * 0.034 / 2;
  Serial.print("Jarak: ");
  Serial.print(distanceCm);
  Serial.println(" cm");
  delay(500);`);
    }

    if (hasRfid) {
      includeLines.push('#include <SPI.h>');
      includeLines.push('#include <MFRC522.h>');
      pinDeclarations.push('#define SS_PIN 10');
      pinDeclarations.push('#define RST_PIN 9');
      pinDeclarations.push('MFRC522 rfid(SS_PIN, RST_PIN);');
      setupLines.push('  SPI.begin();\n  rfid.PCD_Init();\n  Serial.println(F("Tempelkan Tag / Kartu RFID..."));');
      loopLines.push(`  // Deteksi Kartu RFID
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
  Serial.print(F("UID Tag: "));
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(rfid.uid.uidByte[i], HEX);
  }
  Serial.println();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1000);`);
    }

    if (hasOled) {
      includeLines.push('#include <Wire.h>');
      includeLines.push('#include <Adafruit_GFX.h>');
      includeLines.push('#include <Adafruit_SSD1306.h>');
      pinDeclarations.push('#define SCREEN_WIDTH 128\n#define SCREEN_HEIGHT 64\nAdafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);');
      setupLines.push('  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {\n    Serial.println(F("SSD1306 allocation failed"));\n  }\n  display.clearDisplay();\n  display.setTextSize(1);\n  display.setTextColor(SSD1306_WHITE);\n  display.setCursor(0, 10);\n  display.println(F("Circuit Studio"));\n  display.display();');
    }

    if (hasBuzzer) {
      pinDeclarations.push('const int BUZZER_PIN = 8; // Pin Buzzer');
      setupLines.push('  pinMode(BUZZER_PIN, OUTPUT);');
      loopLines.push('  tone(BUZZER_PIN, 1000); // Bunyi nada 1000 Hz\n  delay(500);\n  noTone(BUZZER_PIN);\n  delay(500);');
    }

    if (hasRtc) {
      includeLines.push('#include <Wire.h>');
      includeLines.push('#include <RTClib.h>');
      pinDeclarations.push('RTC_DS3231 rtc;');
      setupLines.push('  if (!rtc.begin()) {\n    Serial.println(F("Modul RTC DS3231 tidak terdeteksi!"));\n  }');
      loopLines.push(`  // Membaca Waktu Real-Time dari DS3231
  DateTime now = rtc.now();
  Serial.print(now.year(), DEC);
  Serial.print('/');
  Serial.print(now.month(), DEC);
  Serial.print('/');
  Serial.print(now.day(), DEC);
  Serial.print(" ");
  Serial.print(now.hour(), DEC);
  Serial.print(':');
  Serial.print(now.minute(), DEC);
  Serial.print(':');
  Serial.print(now.second(), DEC);
  Serial.println();
  delay(1000);`);
    }

    if (hasTft) {
      includeLines.push('#include <SPI.h>');
      includeLines.push('#include <Adafruit_GFX.h>');
      includeLines.push('#include <Adafruit_ILI9341.h>');
      pinDeclarations.push('// Pin konfigurasi TFT LCD ILI9341 (Hardware SPI)\n#define TFT_CS   10\n#define TFT_DC   9\n#define TFT_RST  8\nAdafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);');
      setupLines.push('  tft.begin();\n  tft.setRotation(0);\n  tft.fillScreen(ILI9341_BLACK);\n  tft.setTextColor(ILI9341_WHITE);\n  tft.setTextSize(2);\n  tft.setCursor(20, 30);\n  tft.println("Circuit Studio");');
      loopLines.push('  // Update tampilan grafik atau teks LCD di sini');
    }

    if (hasKeypad) {
      includeLines.push('#include <Keypad.h>');
      if (is4x4) {
        pinDeclarations.push(`const byte ROWS = 4;\nconst byte COLS = 4;\nchar keys[ROWS][COLS] = {\n  {'1', '2', '3', 'A'},\n  {'4', '5', '6', 'B'},\n  {'7', '8', '9', 'C'},\n  {'*', '0', '#', 'D'}\n};\nbyte rowPins[ROWS] = {9, 8, 7, 6}; // Hubungkan ke R1, R2, R3, R4\nbyte colPins[COLS] = {5, 4, 3, 2}; // Hubungkan ke C1, C2, C3, C4\nKeypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);`);
      } else {
        pinDeclarations.push(`const byte ROWS = 4;\nconst byte COLS = 3;\nchar keys[ROWS][COLS] = {\n  {'1', '2', '3'},\n  {'4', '5', '6'},\n  {'7', '8', '9'},\n  {'*', '0', '#'}\n};\nbyte rowPins[ROWS] = {8, 7, 6, 5}; // Hubungkan ke R1, R2, R3, R4\nbyte colPins[COLS] = {4, 3, 2};    // Hubungkan ke C1, C2, C3\nKeypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);`);
      }
      loopLines.push(`  // Membaca Tombol Keypad\n  char key = keypad.getKey();\n  if (key) {\n    Serial.print("Tombol Ditekan: ");\n    Serial.println(key);\n  }`);
    }

    if (hasSoilMoisture) {
      pinDeclarations.push('const int SOIL_ANALOG_PIN = A0;  // Pin Analog Soil Moisture\nconst int SOIL_DIGITAL_PIN = 7; // Pin Digital Soil Moisture (Threshold LM393)');
      setupLines.push('  pinMode(SOIL_DIGITAL_PIN, INPUT);');
      loopLines.push(`  // Membaca Nilai Kelembaban Tanah FC-28\n  int soilMoistureValue = analogRead(SOIL_ANALOG_PIN);\n  int soilDigitalState = digitalRead(SOIL_DIGITAL_PIN);\n  Serial.print("Kelembaban (Analog 0-1023): ");\n  Serial.print(soilMoistureValue);\n  Serial.print(" | Status Digital: ");\n  Serial.println(soilDigitalState == LOW ? "Basah (Lembab)" : "Kering");\n  delay(1000);`);
    }

    if (hasMax31865) {
      includeLines.push('#include <Adafruit_MAX31865.h>');
      pinDeclarations.push('// Modul MAX31865 RTD PT100/PT1000 (Hardware SPI: CS=10)\n// Rref = 430.0 ohm (PT100) atau 4300.0 ohm (PT1000)\nAdafruit_MAX31865 maxRtd = Adafruit_MAX31865(10);\n#define RREF      430.0\n#define RNOMINAL  100.0');
      setupLines.push('  maxRtd.begin(MAX31865_3WIRE); // Gunakan MAX31865_2WIRE, MAX31865_3WIRE, atau MAX31865_4WIRE');
      loopLines.push(`  // Membaca Suhu Presisi RTD PT100\n  float rtdTemp = maxRtd.temperature(RNOMINAL, RREF);\n  Serial.print("Suhu RTD: ");\n  Serial.print(rtdTemp);\n  Serial.println(" *C");\n  delay(1000);`);
    }

    if (hasAds1115) {
      includeLines.push('#include <Wire.h>');
      includeLines.push('#include <Adafruit_ADS1X15.h>');
      pinDeclarations.push('Adafruit_ADS1115 ads; // Inisialisasi ADS1115 ADC (I2C Addr: 0x48)');
      setupLines.push('  if (!ads.begin()) {\n    Serial.println("Gagal menemukan modul ADS1115!");\n  }');
      loopLines.push(`  // Membaca ADC 16-Bit ADS1115 (Channel A0 - A3)\n  int16_t adc0 = ads.readADC_SingleEnded(0);\n  float volts0 = ads.computeVolts(adc0);\n  Serial.print("ADS1115 A0: "); Serial.print(adc0);\n  Serial.print(" ("); Serial.print(volts0, 4); Serial.println(" V)");\n  delay(500);`);
    }

    if (hasLdr) {
      pinDeclarations.push('const int LDR_ANALOG_PIN = A0;  // Pin Analog LDR (AO)\nconst int LDR_DIGITAL_PIN = 7;  // Pin Digital LDR (DO)');
      setupLines.push('  pinMode(LDR_DIGITAL_PIN, INPUT);');
      loopLines.push(`  // Membaca Sensor Cahaya LDR\n  int ldrAnalog = analogRead(LDR_ANALOG_PIN);\n  int ldrState = digitalRead(LDR_DIGITAL_PIN);\n  Serial.print("Intensitas Cahaya LDR: ");\n  Serial.print(ldrAnalog);\n  Serial.print(" | Status Digital: ");\n  Serial.println(ldrState == LOW ? "Terang" : "Gelap");\n  delay(1000);`);
    }

    if (hasIrObstacle) {
      pinDeclarations.push('const int IR_OBSTACLE_PIN = 4; // Pin Output Sensor IR Obstacle (OUT)');
      setupLines.push('  pinMode(IR_OBSTACLE_PIN, INPUT);');
      loopLines.push(`  // Deteksi Rintangan IR Obstacle (Active LOW)\n  int obstacleState = digitalRead(IR_OBSTACLE_PIN);\n  if (obstacleState == LOW) {\n    Serial.println("Rintangan Terdeteksi!");\n  } else {\n    Serial.println("Jalur Bersih (Tidak ada rintangan)");\n  }\n  delay(500);`);
    }

    if (hasTouch) {
      pinDeclarations.push('const int TOUCH_PIN = 3; // Pin Output Sensor Sentuh TTP223 (SIG/IO)');
      setupLines.push('  pinMode(TOUCH_PIN, INPUT);');
      loopLines.push(`  // Deteksi Sentuhan TTP223 (Active HIGH)\n  int touchState = digitalRead(TOUCH_PIN);\n  if (touchState == HIGH) {\n    Serial.println("Tombol Sentuh Ditekan! (Touch Active)");\n  }\n  delay(200);`);
    }

    if (hasVibration) {
      pinDeclarations.push('const int VIBRATION_PIN = 2; // Pin Digital SW-420 (DO)');
      setupLines.push('  pinMode(VIBRATION_PIN, INPUT);');
      loopLines.push(`  // Deteksi Getaran Sensor SW-420\n  int vibrationState = digitalRead(VIBRATION_PIN);\n  if (vibrationState == HIGH) {\n    Serial.println("Getaran Terdeteksi!");\n  }\n  delay(200);`);
    }

    // Default if no specific peripheral mapped
    if (loopLines.length === 0) {
      loopLines.push('  // Baca sensor atau jalankan aktuator di sini\n  delay(100);');
    }

    const fullCode = `/*\n * Kode Otomatis Dibuat oleh Wirecraft\n * Target Board: ${uno.name}\n * Tanggal: ${new Date().toLocaleDateString('id-ID')}\n */\n\n${includeLines.length > 0 ? includeLines.join('\n') + '\n\n' : ''}${pinDeclarations.length > 0 ? pinDeclarations.join('\n') + '\n\n' : ''}void setup() {\n  Serial.begin(9600);\n  Serial.println("Sistem Sirkuit Dimulai...");\n${setupLines.join('\n')}\n}\n\nvoid loop() {\n${loopLines.join('\n\n')}\n}\n`;
    setCode(fullCode);
  }, [isOpen, components, wires]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadIno = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'circuit_sketch.ino';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400"><Code2 className="w-4 h-4" /></div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">Arduino Code IDE<span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">Auto Generated</span></h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sketsa C++ Arduino terkonfigurasi otomatis sesuai kabel dan pin pada kanvas.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-4 bg-slate-900 dark:bg-slate-950 overflow-hidden flex flex-col">
          <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="flex-1 w-full bg-transparent font-mono text-xs text-sky-300 leading-relaxed resize-none outline-none selection:bg-sky-500/30 overflow-y-auto" />
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Bahasa: Arduino C++ (.ino)</span>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer">{copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Tersalin!' : 'Salin Kode'}</button>
            <button onClick={handleDownloadIno} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-md"><Download className="w-3.5 h-3.5" />Download .ino</button>
          </div>
        </div>
      </div>
    </div>
  );
};
