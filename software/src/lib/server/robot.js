var kinematics = require("./../kinematics");

require("sylvester");
var keyboards = require("./keyboards");
var method = Robot.prototype;

function Robot(servo1, servo2, servo3, calibration) {
  this._servo1 = servo1;
  this._servo2 = servo2;
  this._servo3 = servo3;
  this._calibration = calibration;
  this._dancer_interval = null;
}

var generateTranslationMatrix = function(calibration) {

    var r1x = calibration.device.contactPoint.position.x;
    var r1y = calibration.device.contactPoint.position.y;
    var r2x = calibration.device.point1.position.x;
    var r2y = calibration.device.point1.position.y;
    var r3x = calibration.device.point2.position.x;
    var r3y = calibration.device.point2.position.y;

    var d1x = calibration.device.contactPoint.screenCoordinates.x;
    var d1y = calibration.device.contactPoint.screenCoordinates.y;
    var d2x = calibration.device.point1.screenCoordinates.x;
    var d2y = calibration.device.point1.screenCoordinates.y;
    var d3x = calibration.device.point2.screenCoordinates.x;
    var d3y = calibration.device.point2.screenCoordinates.y;

    var deviceXVector = $M([[(d3x-d1x) / (r3x-r1x)], [(d3y-d1y) / (r3x-r1x) ]]);
    var deviceYVector = $M([[(d2x-d1x) / (r2y-r1y)], [(d2y-d1y) / (r2y-r1y) ]]);
    var offset = $M([d1x-r1x, d1y-r1y]);
    var r2dMatrix = $M([[deviceXVector.elements[0], deviceYVector.elements[0]], [deviceXVector.elements[1], deviceYVector.elements[1]]]);
    return {offset: offset, matrix: r2dMatrix};
    /*

  var b0x = calibration.device.point1.position.x,
    b0y = calibration.device.point1.position.y,
    b1x = calibration.device.point2.position.x,
    b1y = calibration.device.point2.position.y;
  var d0x = calibration.device.point1.screenCoordinates.x,
    d0y = calibration.device.point1.screenCoordinates.y,
    d1x = calibration.device.point2.screenCoordinates.x,
    d1y = calibration.device.point2.screenCoordinates.y;

  var M = $M([
    [d0x, d0y, 1, 0],
    [-d0y, d0x, 0, 1],
    [d1x, d1y, 1, 0],
    [-d1y, d1x, 0, 1]
  ]);
  var u = $M([
    [b0x],
    [b0y],
    [b1x],
    [b1y]
  ]);
  var MI = M.inverse();
  return MI.multiply(u);*/
};

var sin = function(degree) {
  return Math.sin(Math.PI * (degree/180));
};

var cos = function(degree) {
  return Math.cos(Math.PI * (degree/180));
};

var mapNumber = function (num,  in_min , in_max , out_min , out_max ) {
  return ( num - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
};

var rotate = function(x,y) {
  var theta = -60;
  var x1 = x * cos(theta) - y * sin(theta);
  var y1 = y * cos(theta) + x * sin(theta);
  return [x1,y1]
};

var reflect = function(x,y) {
  var theta = 0;
  var x1 = x;
  var y1 = x * sin(2*theta) - y * cos(2*theta);
  return [x1,y1]
};


method.getAngles = function() {
  return [this._servo1.last.degrees, this._servo2.last.degrees, this._servo3.last.degrees];
};

method.setAngles = function(t1,t2,t3) {
  console.log("Setting Angles:" + [t1,t2,t3]);
  t1 = isNaN(t1) ? this._calibration.servo1.minimumAngle : t1;
  t2 = isNaN(t2) ? this._calibration.servo1.minimumAngle : t2;
  t3 = isNaN(t3) ? this._calibration.servo1.minimumAngle : t3;
  this._servo1.to(t1);
  this._servo2.to(t2);
  this._servo3.to(t3);
};

method.getPosition = function() {
  var angles = this.getAngles();
  return kinematics.forward(angles[0], angles[1], angles[2]);
};

method.setPosition = function(x, y, z) {
  console.log("Setting Position:" + [x,y,z]);
  var reflected = reflect(x,y);
  var rotated = rotate(reflected[0],reflected[1]);
  var angles = kinematics.inverse(rotated[0], rotated[1], z);
  var t1 = mapNumber(angles[1], 0 , 90 , this._calibration.servo1.minimumAngle ,  this._calibration.servo1.maximumAngle);
  var t2 = mapNumber(angles[2], 0 , 90 , this._calibration.servo2.minimumAngle ,  this._calibration.servo2.maximumAngle);
  var t3 = mapNumber(angles[3], 0 , 90 , this._calibration.servo3.minimumAngle ,  this._calibration.servo3.maximumAngle);
  this.setAngles(t1,t2,t3);
};

method.resetPosition = function() {
  this.setPosition(this._calibration.restPoint.x, this._calibration.restPoint.y, this._calibration.restPoint.z);
};

method.getPositionForAngles = function(t1,t2,t3) {
  var points = kinematics.forward(t1,t2,t3);
  return [points[1], points[2], points[3]];
};

method.getAnglesForPosition = function(x,y,z) {
  var angles = kinematics.inverse(x,y,z);
  return [angles[1], angles[2], angles[3]];
};

method.getPositionForScreenCoordinates = function(x,y) {
  var calData = generateTranslationMatrix(this._calibration);
    var matrix = calData.matrix;
    var offset = calData.offset;
    var vector = $M([ [x-offset.elements[0]],[y-offset.elements[1]] ]);
    var converted = matrix.inverse().multiply(vector);
    var newX = converted.elements[0];
    var newY = converted.elements[1];
    return {x:newX, y:newY};
    /*
  var matrix = generateTranslationMatrix(this._calibration);
  var a = matrix.elements[0][0],
    b = matrix.elements[1][0],
    c = matrix.elements[2][0],
    d = matrix.elements[3][0];
  var yprime = a * x + b * y + c;
  var xprime = b * x - a * y + d;
  console.log("(" + x +"," + y +") => (" + xprime + "," + yprime +")");
  return {x:xprime, y:yprime};
  */
};

method.getContactZ = function() {
  return  1.01 * Math.min(
      this._calibration.device.contactPoint.position.z,
      this._calibration.device.point1.position.z,
      this._calibration.device.point2.position.z
    );
};

method.tap = function(screenX, screenY, cb) {
  var position = this.getPositionForScreenCoordinates(screenX, screenY);
  var touchZ = this.getContactZ();
  this.setPosition(position.x, position.y, touchZ * 0.9);
  return setTimeout(function() {
    this.setPosition(position.x, position.y, touchZ);
    return setTimeout(function() {
      this.setPosition(position.x, position.y, touchZ * 0.9);
      return setTimeout(cb, 400);
    }.bind(this), 400);
  }.bind(this), 400);
};

method.swipe = function(startX, startY, endX, endY, cb) {
  var startPosition = this.getPositionForScreenCoordinates(startX, startY);
  var endPosition = this.getPositionForScreenCoordinates(endX, endY);
  var touchZ = this.getContactZ();
  this.setPosition(startPosition.x, startPosition.y, touchZ * 0.9);
  return setTimeout(function() {
    this.setPosition(startPosition.x, startPosition.y, touchZ);
    return setTimeout(function() {
      this.setPosition(endPosition.x, endPosition.y, touchZ);
      return setTimeout(function() {
        this.setPosition(endPosition.x, endPosition.y, touchZ * 0.9);
        return setTimeout(cb, 100);
      }.bind(this), 400);
    }.bind(this), 400);
  }.bind(this), 400);
};

method.sendKeys = function(keys, cb) {
  var keyboard = keyboards.getKeyboard("iPhone 6"/*this._calibration.device.name*/);
  var keystrokeSequence = [];
  for (var keyIndex=0; keyIndex < keys.length; keyIndex++) {
    keystrokeSequence = keystrokeSequence.concat(keyboard.getKeySequence(keys[keyIndex]));
  }
  var tapKey = function(keystrokes, cb) {
    if (keystrokes.length == 0) {
      return cb();
    } else {
      var currentKeyPosition = keystrokes.shift();
      this.tap(currentKeyPosition.x, currentKeyPosition.y, function() {
        return tapKey(keystrokes, cb);
      });
    }
  }.bind(this);
  return tapKey(keystrokeSequence, cb);
};

method.startDancing = function() {
  var _dance = function() {
    var minAngle = 10;
    var maxAngle = 20;
    var range = maxAngle - minAngle;
    var t1 = parseInt((Math.random() * range) + minAngle, 10);
    var t2 = parseInt((Math.random() * range) + minAngle, 10);
    var t3 = parseInt((Math.random() * range) + minAngle, 10);
    this.setAngles(t1,t2,t3);
  }.bind(this);

  if (!this._dancer_interval) {
    this._dancer_interval = setInterval(_dance, 250);
  }
};

method.stopDancing = function() {
  if (this._dancer_interval) {
    clearInterval(this._dancer_interval);
    this._dancer_interval = null;
  }
};

method.getCalibrationData = function() {
  return this._calibration;
};

method.setCalibrationData = function(newData) {
  this._calibration = newData;
};

module.exports = {};
module.exports.Robot = Robot;