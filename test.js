// test.ts
var randomDigit = function() {
  return Math.floor(Math.random() * Math.floor(2));
};
var generateRandomBinary = function() {
  let binary = "";
  for (let i = 0;i < NUMBER_OF_BITS; ++i) {
    binary += randomDigit();
  }
  return binary;
};
var formatPassed = function(passed, p) {
  let color = passed ? "green" : "red";
  p.style.color = color;
  p.innerText = passed ? "passed" : "not passed";
};
var clearStatus = function() {
  htmlStatusMonobit.innerText = "";
  htmlStatusPoker.innerHTML = "";
  htmlStatusRuns.innerHTML = "";
  htmlStatusLongRun.innerHTML = "";
};
var NUMBER_OF_BITS = 20000;
var BITS_IN_BYTE = 8;
var NUMBER_OF_BYTES = NUMBER_OF_BITS / BITS_IN_BYTE;
var NUMBER_OF_NIBBLES = NUMBER_OF_BYTES * 2;
var MONOBIT_LOWER = 9654;
var MONOBIT_UPPER = 10346;
var POKER_K = NUMBER_OF_NIBBLES;
var POKER_M = 4;
var POKER_LOWER = 1.03;
var POKER_UPPER = 57.4;
var RUNS_LOWER = [2267, 1079, 502, 223, 90, 90];
var RUNS_UPPER = [2733, 1421, 748, 402, 223, 223];
var LONG_RUN_UPPER = 33;

class Tests {
  bytes;
  constructor(bits) {
    this.bytes = this.preprocess(bits);
  }
  preprocess(bits) {
    if (bits.length !== NUMBER_OF_BITS) {
      throw new Error("There should be 20000 bits");
    }
    const array = new Uint8Array(NUMBER_OF_BYTES);
    for (let i = 0;i < NUMBER_OF_BYTES; i++) {
      const byteString = bits.slice(i * BITS_IN_BYTE, i * BITS_IN_BYTE + BITS_IN_BYTE);
      const byte = parseInt(byteString, 2);
      array[i] = byte;
    }
    return array;
  }
  monobit(DEBUG = false) {
    let numberOfOnes = 0;
    for (let i = 0;i < NUMBER_OF_BYTES; i++) {
      numberOfOnes += Tests.hammingWeightUint8Bit(this.bytes[i]);
    }
    if (DEBUG) {
      console.log(`There are ${numberOfOnes} one's`);
    }
    return numberOfOnes > MONOBIT_LOWER && numberOfOnes < MONOBIT_UPPER;
  }
  static hammingWeightUint8Bit(b) {
    if (b < 0 || b > 255) {
      throw new Error("It should be byte");
    }
    b = b - (b >> 1 & 85);
    b = (b & 51) + (b >> 2 & 51);
    return b + (b >> 4) & 15;
  }
  poker(DEBUG = false) {
    const f = new Array(16).fill(0);
    for (let i = 0;i < NUMBER_OF_BYTES; i++) {
      f[Tests.upperNibble(this.bytes[i])] += 1;
      f[Tests.lowerNibble(this.bytes[i])] += 1;
    }
    const sum = f.map((x) => Math.pow(x, 2)).reduce((a, b) => a + b, 0);
    const X = Math.pow(2, POKER_M) / POKER_K * sum - POKER_K;
    if (DEBUG) {
      console.log(`X value: ${X}`);
    }
    return X > POKER_LOWER && X < POKER_UPPER;
  }
  static upperNibble(x) {
    return x >> 4 & 15;
  }
  static lowerNibble(x) {
    return x & 15;
  }
  runs(DEBUG = false) {
    const zeroes = {};
    const ones = {};
    for (let i = 1;i <= 6; i++) {
      zeroes[i] = 0;
      ones[i] = 0;
    }
    let zeroCounter = 0;
    let oneCounter = 0;
    for (let i = 0;i < NUMBER_OF_BYTES; i++) {
      for (let j = 7;j >= 0; j--) {
        const bit = this.bytes[i] & 1 << j ? 1 : 0;
        if (bit === 0) {
          if (oneCounter >= 6) {
            oneCounter = 6;
          }
          if (oneCounter > 0) {
            ones[oneCounter] += 1;
          }
          oneCounter = 0;
          zeroCounter += 1;
        } else {
          if (zeroCounter >= 6) {
            zeroCounter = 6;
          }
          if (zeroCounter > 0) {
            zeroes[zeroCounter] += 1;
          }
          zeroCounter = 0;
          oneCounter += 1;
        }
      }
    }
    if (DEBUG) {
      console.log("zeroes:", zeroes, "\none's:\n", ones);
    }
    const isBetween = (x, lower, upper) => x >= lower && x <= upper;
    if (Object.entries(zeroes).some(([key, value]) => !isBetween(value, RUNS_LOWER[Number(key) - 1], RUNS_UPPER[Number(key) - 1]))) {
      return false;
    }
    if (Object.entries(ones).some(([key, value]) => !isBetween(value, RUNS_LOWER[Number(key) - 1], RUNS_UPPER[Number(key) - 1]))) {
      return false;
    }
    return true;
  }
  longRun(DEBUG = false) {
    let zeroCounter = 0;
    let oneCounter = 0;
    for (let i = 0;i < NUMBER_OF_BYTES; i++) {
      for (let j = 7;j >= 0; j--) {
        const bit = this.bytes[i] & 1 << j ? 1 : 0;
        if (bit == 0) {
          if (oneCounter > LONG_RUN_UPPER) {
            console.log("hello");
            if (DEBUG) {
              console.log(`long run one's has ${oneCounter}`);
            }
            return false;
          }
          oneCounter = 0;
          zeroCounter += 1;
        } else {
          if (zeroCounter > LONG_RUN_UPPER) {
            if (DEBUG) {
              console.log(`long run zeroes has ${oneCounter}`);
            }
            return false;
          }
          zeroCounter = 0;
          oneCounter += 1;
        }
      }
    }
    if (oneCounter > LONG_RUN_UPPER || zeroCounter > LONG_RUN_UPPER) {
      return false;
    }
    return true;
  }
}
var get = (id) => document.getElementById(id);
var htmlBits = get("bits");
var htmlTest = get("test");
var htmlGenerate = get("generate");
var htmlError = get("error");
var htmlCheckboxMonobit = get("monobit");
var htmlStatusMonobit = get("status_monobit");
var htmlCheckboxPoker = get("poker");
var htmlStatusPoker = get("status_poker");
var htmlCheckboxRuns = get("runs");
var htmlStatusRuns = get("status_runs");
var htmlCheckboxLongRun = get("long_run");
var htmlStatusLongRun = get("status_long_run");
var htmlDebug = get("debug");
htmlTest.addEventListener("click", function() {
  htmlError.innerText = "";
  clearStatus();
  try {
    let test = new Tests(htmlBits.value);
    const DEBUG = htmlDebug.checked;
    if (htmlCheckboxMonobit.checked) {
      let monobitResult = test.monobit(DEBUG);
      formatPassed(monobitResult, htmlStatusMonobit);
    }
    if (htmlCheckboxPoker.checked) {
      let pokerResult = test.poker(DEBUG);
      formatPassed(pokerResult, htmlStatusPoker);
    }
    if (htmlCheckboxRuns.checked) {
      let runsResult = test.runs(DEBUG);
      formatPassed(runsResult, htmlStatusRuns);
    }
    if (htmlCheckboxLongRun.checked) {
      let longRunResult = test.longRun(DEBUG);
      formatPassed(longRunResult, htmlStatusLongRun);
    }
  } catch (e) {
    htmlError.innerText = e.message;
    clearStatus();
  }
});
htmlGenerate.addEventListener("click", function() {
  htmlBits.value = generateRandomBinary();
});
