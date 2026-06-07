#include <Stepper.h>
#include <Servo.h>

const int stepsPerRevolution = 2048;

Stepper xStepper(stepsPerRevolution, 6, 8, 7, 9);
Stepper yStepper(stepsPerRevolution, 2, 4, 3, 5);

int xPins[4] = {6, 8, 7, 9};
int yPins[4] = {2, 4, 3, 5};

const int SERVO_PIN = 13;
Servo servo;

long xpos = 0;
long ypos = 0;
boolean pPenOnPaper = false;

const int stepCount = 200;

// Full tape height in Y steps: 4 grid units * yScale(230) * yGear(3.501)
const long Y_MAX = 3221;

void setup() {
  Serial.begin(9600);

  servo.attach(SERVO_PIN);
  penUp();

  xStepper.setSpeed(10);
  yStepper.setSpeed(12);

  homeYAxis();
  xpos = 0;
  ypos = 0;
  releaseMotors();
  Serial.println("READY");
}

void loop() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() == 0) return;

    if (cmd.startsWith("G ")) {
      int s1 = cmd.indexOf(' ', 2);
      int s2 = cmd.indexOf(' ', s1 + 1);
      long x = cmd.substring(2, s1).toInt();
      long y = cmd.substring(s1 + 1, s2).toInt();
      int draw = cmd.substring(s2 + 1).toInt();
      if (x < 0 || y < 0 || y > Y_MAX) {
        Serial.println("ERR");
      } else {
        line(x, y, draw);
        Serial.println("OK");
      }
    } else if (cmd == "PU") {
      penUp();
      Serial.println("OK");
    } else if (cmd == "PD") {
      penDown();
      Serial.println("OK");
    } else if (cmd == "R") {
      releaseMotors();
      Serial.println("OK");
    } else if (cmd == "H") {
      homeYAxis();
      xpos = 0;
      ypos = 0;
      Serial.println("OK");
    } else if (cmd.startsWith("SX ")) {
      xStepper.setSpeed(cmd.substring(3).toInt());
      Serial.println("OK");
    } else if (cmd.startsWith("SY ")) {
      yStepper.setSpeed(cmd.substring(3).toInt());
      Serial.println("OK");
    } else {
      Serial.println("ERR");
    }
  }
}

void line(long newx, long newy, bool drawing) {
  plot(drawing);

  long over = 0;
  long dx = newx - xpos;
  long dy = newy - ypos;
  int dirx = dx > 0 ? -1 : 1;
  int diry = dy > 0 ? 1 : -1;
  dx = abs(dx);
  dy = abs(dy);

  if (dx > dy) {
    over = dx / 2;
    for (long i = 0; i < dx; i++) {
      xStepper.step(dirx);
      over += dy;
      if (over >= dx) {
        over -= dx;
        yStepper.step(diry);
      }
    }
  } else {
    over = dy / 2;
    for (long i = 0; i < dy; i++) {
      yStepper.step(diry);
      over += dx;
      if (over >= dy) {
        over -= dy;
        xStepper.step(dirx);
      }
    }
  }
  xpos = newx;
  ypos = newy;
}

void plot(boolean penOnPaper) {
  if (penOnPaper) {
    servo.write(80);
  } else {
    servo.write(25);
  }
  if (penOnPaper != pPenOnPaper) delay(50);
  pPenOnPaper = penOnPaper;
}

void penUp() {
  servo.write(25);
}

void penDown() {
  servo.write(80);
}

void releaseMotors() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(xPins[i], 0);
    digitalWrite(yPins[i], 0);
  }
  plot(false);
}

void homeYAxis() {
  yStepper.step(-4000);
}
