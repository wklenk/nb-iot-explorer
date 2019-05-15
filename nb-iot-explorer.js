/*
  Explore NB-IoT radio networks in a comfortable and user-friendly way using Espruino Pixel.js and
  Dragino NB-IoT Shield QG96 (Quectel BG96 module).

  Note: If you have chosen to upload the code to RAM (default) in the Espruino IDE, you need
        to interactively call "onInit();" on the device's JavaScript console after uploading.
        After that, press the Reset button on the NB-IoT Shield in order to get the BG96 module
        configured. The backlight will flicker 4 times to indicate that the BG96 module has
        executed a reset and is going to be configured.

        LOW MEMORY IS AN ISSUE - USE MINIFICATION!
        There are many comments and long variable names in this code that eat up lots of memory.
        Use the "online minification" feature of the Espruino IDE memory (e.g. "Closure (online))

  Copyright (C) 2019  Wolfgang Klenk <wolfgang.klenk@gmail.com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/

var at;
var debug = false;
var backlightOn = false;
var currentScreen = 0;
var updateIntervalId;
var updateIntervalMs = 10000; // Update every 10 seconds

// NB1 connectivity settings for 1NCE
var connection_options = {
  band: "B8",
  apn: "iot.1nce.net",
  operator: "26201"
};

// NB1 connectivity settings for Vodafone Germany
/*
var connection_options = {
  band: "B20",
  apn: "vgesace.nb.iot",
  operator: "26202",
};
*/

// Slash screen
var img = {
  width : 122, height : 27, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("AAAAAAAAAAAAAAHwAAAADwB4P//gAAAB4AP/AB//x+A/H//8AAAA/AP/8A//+fwfx///gAAAfwH//gf//n+H8f//8AAAH8D//+H//5/h/H///AAAB/B///g//+f8fw///wAAAfw///8P//n/H8H//8AAAH8P/H/B//x/5/AAB/AAAB/H/Af4B/Af/fwAA/wAAAfx/gD+AfwH/38P//4P/+H8fwA/wH8B///H//+H//x/H8AH8B/Af//x///B//+fx/AB/AfwH//8f//Af//n8fwAfwH8B///H//8H//5/H8AH8B/Af//w///g//8fx/AD/AfwH9/8H//8H/8H8f4A/gH8B/f/AAB/AAAB/H/Af4B/Afz/wAA/wAAAfw/8f8AfwH8/8P//8AAAH8P///AH8B/H/H///AAAB/B///gB/Afw/x///wAAAfwP//4AfwH8H8f//4AAAH8B//4AH8B/B/H//+AAAA/AP/8AB/APgPg///AAAAPgA/8AAPgBgAwH//AAAAAwAB8AABwAAAAAAAAAAAAAAAAAAAAAA=="))
};

var content = {
    'timeUtc': '',
    'date': '',
    'longitude': 0.0,
    'latitude': 0.0,
    'elevation': '',
    'nsat': 0,
    'networkName': '',
    'rplmn': '',
    'mcc': '',
    'mnc': '',
    'providerName': '',
    'rssi': '',
    'rssiValue': 0,
    'operator': '',
    'band': '',
    'channel': '',
    'status1': '',
    'status2': '',
    'trackingAreaCode': '',
    'cellId': '', // 28 Bit in LTE
    'eNbId': '',  // E-UTRAN Node B, also known as Evolved Node B ID
    'sector': '',
    'accessTechnology': '',
    'ipAddress': ''
};

var screens = [
  {
    'title': 'Registered Network',
    'rows': [
      { 'label': 'Network',  'content': 'networkName'},
      { 'label': 'RPLMN',    'content': 'rplmn'},
      { 'label': 'Provider', 'content': 'providerName'}
    ]
  },
  {
    'title': 'Registration Status',
    'rows': [
      { 'label': 'Status',  'content': 'status1'},
      { 'label': '',        'content': 'status2'},
      { 'label': 'RSSI',    'content': 'rssi'}
    ]
  },
  {
    'title': 'Cell Information',
    'rows': [
      { 'label': 'TAC',     'content': 'trackingAreaCode'},
      { 'label': 'Cell ID', 'content': 'cellId'},
      { 'label': 'eNB ID',  'content': 'eNbId'},
      { 'label': 'Sector',  'content': 'sector'}
    ]
  },
  {
    'title': 'Network Information',
    'rows': [
      { 'label': 'Access',  'content': 'accessTechnology'},
      { 'label': 'Band',    'content': 'band'},
      { 'label': 'Channel', 'content': 'channel'}
    ]
  },
  {
    'title': 'IP Address',
    'rows': [
      { 'label': 'Address',  'content': 'ipAddress'}
    ]
  },
  {
    'title': 'Geo Position',
    'rows': [
      { 'label': 'Longitude',  'content': 'longitude'},
      { 'label': 'Latitude',   'content': 'latitude'},
      { 'label': 'Elevation',  'content': 'elevation'},
      { 'label': 'Satellites', 'content': 'nsat'}
    ]
  },
  {
    'title': 'Date and Time',
    'rows': [
      { 'label': 'Date',       'content': 'date'},
      { 'label': 'Time (UTC)', 'content': 'timeUtc'}
    ]
  }
];

require("Font8x12").add(Graphics);

var band_values = {
  "B1": "1",
  "B2": "2",
  "B3": "4",
  "B4": "8",
  "B5": "10",
  "B8": "80",
  "B12": "800",
  "B13": "1000",
  "B18": "20000",
  "B19": "40000",
  "B20": "80000",
  "B26": "2000000",
  "B28": "8000000"
};

// Values are split up into 2 lines by space character.
var registration_status_values = {
  '0': 'Not registered',
  '1': 'Registered Home-Network',
  '2': 'Searching',
  '3': 'Registration denied',
  '4': 'Unknown',
  '5': 'Registered Roaming'
};

var access_technology_values = {
  '0': 'GSM',
  '8': 'LTE Cat M1',
  '9': 'LTE Cat NB1'
};

// Sends an AT command to the BG96 module (via the serial line)
// Returns a promise that resolves in case the command was successful or is rejected in case of error.
sendAtCommand = function (command, timeoutMs, waitForLine) {
  return new Promise((resolve, reject) => {

    var answer = "";
    at.cmd(command + "\r\n", timeoutMs || 1E3, function processResponse(response) {
      if (undefined === response || "ERROR" === response || response.startsWith("+CME ERROR")) {
        reject(response ? (command + ": " + response) : (command + ": TIMEOUT"));
      } else if (waitForLine ? (response.startsWith(waitForLine)) : ("OK" === response)) {
        resolve(waitForLine ? response : answer);
      } else {
        answer += (answer ? "\n" : "") + response;
        return processResponse;
      }
    });
  });
};

function toggleBacklight() {
  if (backlightOn) {
    LED.reset();
  } else {
    LED.set();
  }
  backlightOn = !backlightOn;
}

// Changes the backlight n times.
// Returns a Promise, so it can be used in a chain of Promises.
function flickerBacklight(n) {
  var i;
  var p = new Promise((resolve) => {
    resolve();
  });

  // How to use Promises in a loop :)
  for (i = 0 ; i < n ; i++) {
    p = p.then(() => {
      toggleBacklight();
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 200);
      });
    });
  }

  return p;
}

function drawCurrentScreen() {
  g.clear();
  g.fillRect(0, 0, 127, 12);
  g.setFontAlign(0, -1, 0);
  g.setColor(0, 0, 0);
  g.drawString(screens[currentScreen].title, 64, 0);
  g.setColor(1, 1, 1);
  g.setFontAlign(-1, -1, 0);

  var row;
  var y = 14;
  for (row = 0; row < screens[currentScreen].rows.length; row++) {
    g.drawString(screens[currentScreen].rows[row].label, 0, y);
    g.drawString(content[screens[currentScreen].rows[row].content], 60, y);
    y += 13;
  }

  g.flip();
}

// Configures the BG96 module with all settings to connect to the specified network via NB-IoT.
// Returns a Promise.
function configureModem() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), 1000);
  })
    .then(() => sendAtCommand('AT&F0')) // Factory reset
    .then(() => sendAtCommand('ATE0')) // Don't echo commands
    .then(() => sendAtCommand('AT+CPIN?')) // Fails on locked PIN or SIM inserted in wrong direction or not inserted at all.
    .then(() => {
      var band_value = band_values[connection_options.band];
      if (undefined === band_value) throw("Unknown band: " + connection_options.band);

      return sendAtCommand('AT+QCFG="band",0,0,' + band_value + ',1');
    })
    .then(() => sendAtCommand('AT+QCFG="nwscanmode",3,1')) // Network Search Mode, LTE only
    .then(() => sendAtCommand('AT+QCFG="nwscanseq",030102,1')) // Network Search Sequence, NB-Iot, GSM, CatM1
    .then(() => sendAtCommand('AT+QCFG="iotopmode",1,1')) // LTE Search Mode: NB-IoT only
    .then(() => sendAtCommand('AT+QCFG="servicedomain",1,1')) // Set PS domain, PS only
    .then(() => sendAtCommand('AT+CGDCONT=1,"IP",' + JSON.stringify(connection_options.apn)))
    .then(() => sendAtCommand('AT+CFUN=1'))
    .then(() => sendAtCommand('AT+QGPS?'))
    .then((line) => {
      if (line.substr('+QGPS: '.length) === '0') { // GNSS is off
        return sendAtCommand('AT+QGPS=1'); // Turn on GNSS in stand-alone mode
      }
    })
    .then(() => sendAtCommand('AT+CEREG=2'))
    // It may take some minutes now for the modem to manually register at the network provider.
    // The modem LED should flash in the rhythm "on-off-off-off" periodically to indicate network search.
    // There is no need to actively wait for an "OK" response, the modem will go on trying to connect
    // to the network anyway.
    .then(() => sendAtCommand('AT+COPS=1,2,' + JSON.stringify(connection_options.operator) + ',9', 5000))
    .catch((err) => {
      console.log('catch', err); // AT+COPS=1,2,...,9: TIMEOUT is okay here.
    });
}

// Queries new information from the BG96 module.
// Returns a Promise
function getValueUpdates() {
  return sendAtCommand('AT+CEREG?')
    .then( (line) => {
      var lineItems = line.substr('+CEREG: '.length).split(',');

      var statusItems = registration_status_values[lineItems[1]].split(' ');
      content.status1 = statusItems[0];
      if (statusItems.length > 1) {
        content.status2 = statusItems[1];
      } else {
        content.status2 = '';
      }

      if (lineItems[1] === '0') {
        // Not yet registered to network. Try again to register manually.
        return sendAtCommand('AT+COPS=1,2,' + JSON.stringify(connection_options.operator) + ',9', 5000);
      }

      if (lineItems[1] === '2') {
        // Still searching the network. Try to register manually.
        return sendAtCommand('AT+COPS=1,2,' + JSON.stringify(connection_options.operator) + ',9', 5000);
      }

      content.trackingAreaCode = lineItems[2].substr(1, lineItems[2].length - 2);
      var cellId = lineItems[3].substr(1, lineItems[3].length - 2);
      content.cellId = cellId + 'h';
      content.accessTechnology = access_technology_values[lineItems[4]];

      // In LTE, we expect the Cell ID to be 28 bit long
      content.eNbId = parseInt(cellId.substr(0, cellId.length - 2), 16);
      content.sector = parseInt(cellId.substr(cellId.length - 2, cellId.length), 16);
    })
    .then(() => sendAtCommand('AT+CGPADDR=1'))
    .then((line) => {
      var lineItems = line.substr('+CGPADDR: '.length).split(',');
      content.ipAddress = lineItems[1];

      return sendAtCommand('AT+CSQ');
    })
    .then((line) => {
      var lineItems = line.substr('+CSQ: '.length).split(',');
      var rssi = parseInt(lineItems[0]);
      content.rssiValue = rssi;

      if (rssi === 0) {
        content.rssi = '< -113dBm (0)';
      } else if (rssi === 31) {
        content.rssi = '> -51dBm (31)';
      } else if (rssi > 0 && rssi < 31) {
        var v = (rssi - 1) * 2 - 111;
        content.rssi = v.toString() + 'dBm (' + rssi + ')';
      } else if (rssi === 99) {
        content.rssi = 'Unknown (' + rssi + ')';
      } else {
        content.rssi = 'Invalid (' + rssi + ')';
      }

      return sendAtCommand('AT+QNWINFO');
    })
    .then((line) => {
      var lineItems = line.substr('+QNWINFO: '.length).split(',');
      content.operator = lineItems[1].substr(1, lineItems[1].length-2);
      content.band = lineItems[2].substr(1, lineItems[2].length-2);
      content.channel = lineItems[3];

      return sendAtCommand('AT+QSPN');
    })
    .then((line) => {
      var lineItems = line.substr('+QSPN: '.length).split(',');

      content.networkName = lineItems[0].substr(1, lineItems[0].length - 2);
      content.providerName = lineItems[2].substr(1, lineItems[2].length - 2);
      content.rplmn = lineItems[4].substr(1, lineItems[4].length - 2);
      content.mcc = lineItems[4].substr(1, 3);
      content.mnc = lineItems[4].substr(4, 2);
    })
    .catch((line) => {
      // Catch any error before and to on with GNSS
      console.log('Network issue', line);
    })
    .then(() => {
      return sendAtCommand('AT+QGPSLOC=2'); // Obtain GNSS positioning information.
    })
    .then((line) => {
      if (line) {
        var parameters = line.substr('+QGPSLOC: '.length).split(',');

        var time = parameters[0];
        content.timeUtc = time.substr(0, 2) + ":" + time.substr(2, 2) + ":" + time.substr(4, 2);
        content.latitude = parseFloat(parameters[1]);
        content.longitude = parseFloat(parameters[2]);
        content.elevation = parameters[4] + 'm';

        var date = parameters[9];
        content.date = '20'
          + date.substr(4, 2)
          + '-'
          + date.substr(2, 2)
          + '-'
          + date.substr(0, 2);

        content.nsat = parseInt(parameters[10]);
      } else {
        content.timeUtc = '';
        content.date = '';
        content.latitude = 0.0;
        content.longitude =0.0;
        content.elevation = '0m';
        content.nsat = 0;
      }
    })
    .then(() => {
        drawCurrentScreen();
      },
      (line) => {
        drawCurrentScreen(); // Draw screen even if GNSS is not ready yet
        console.log('GNSS issue', line); // +CME ERROR: 516 is okay here. GNSS position not fixed yet.
      }
    );
}

function onInit() {
  Bluetooth.setConsole(true);

  clearWatch(); // Clear all watches
  clearInterval(); // Stop all timers and intervals

  // Reconfigure UART to use pins D10/D11 for serial communication
  Serial1.removeAllListeners();
  Serial1.on('data', (data) => {}); // Suck up any data that gets transmitted from the modem as it boots (RDY, etc)
  Serial1.setup(9600, {tx: D11, rx: D10});

  at = require("AT").connect(Serial1);

  if (debug) {
    at.debug(true);
  }

  // Either the Quectel BG96 module just powered up,
  // or someone pressed the Reset button.
  // In both cases, reconfigure the Quectel BG96 module.
  at.register('RDY', (line) => {
    if (updateIntervalId) {
      clearInterval(updateIntervalId);
    }

    flickerBacklight(10)
      .then(() => configureModem())
      .then(() => {
        updateIntervalId = setInterval(getValueUpdates, updateIntervalMs);
        if (debug) console.log('Modem initialized.');
      });

    // Note: at.register() always expects you return the remainder of the line!
    return line.substr('RDY'.length);
  });

  // Animations are funny :)
  for (var x=128 ; x>4 ; x -= 2) {
    g.clear();
    g.drawImage(img, x, 2);
    g.flip();
  }

  g.setFont8x12();
  g.setFontAlign(0, -1, 0);
  g.drawString('Explorer', 64, 35);
  g.drawString('(c) 2019 Wolfgang Klenk', 64, 51);
  g.flip();

  setWatch(() => {
    toggleBacklight();
  }, BTN1, {edge:"rising", debounce:50, repeat:true});

  setWatch(() => {
    currentScreen--;
    if (currentScreen < 0) {
      currentScreen = screens.length - 1;
    }
    drawCurrentScreen();
  }, BTN2, {edge:"rising", debounce:50, repeat:true});

  setWatch(() => {
    currentScreen++;
    if (currentScreen >= screens.length) {
      currentScreen = 0;
    }
    drawCurrentScreen();
  }, BTN3, {edge:"rising", debounce:50, repeat:true});

  console.log('Press RESET button on NB-IoT shield if onInit() was called interactively.');
}


