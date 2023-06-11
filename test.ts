// FIPS140-1 https://doi.org/10.6028/NIST.FIPS.140-1
// FIPS140-2 https://doi.org/10.6028/NIST.FIPS.140-2
// FIPS140-3 https://doi.org/10.6028/NIST.FIPS.140-3
// version 1 constants will be used
const NUMBER_OF_BITS = 20_000;
const BITS_IN_BYTE = 8;
const NUMBER_OF_BYTES = NUMBER_OF_BITS / BITS_IN_BYTE;
const NUMBER_OF_NIBBLES = NUMBER_OF_BYTES * 2;
const MONOBIT_LOWER = 9654;
const MONOBIT_UPPER = 10346;
const POKER_K = NUMBER_OF_NIBBLES;
const POKER_M = 4;
const POKER_LOWER = 1.03;
const POKER_UPPER = 57.4;
const RUNS_LOWER = [2267, 1079, 502, 223, 90, 90];
const RUNS_UPPER = [2733, 1421, 748, 402, 223, 223];
const LONG_RUN_UPPER = 33;

class Tests {
  public bytes: Uint8Array;

  constructor(bits: string) {
    this.bytes = this.preprocess(bits);
  }

  private preprocess(bits: string): Uint8Array {
    if (bits.length !== NUMBER_OF_BITS) {
      throw new Error("There should be 20000 bits");
    }
    const array = new Uint8Array(NUMBER_OF_BYTES);
    for (let i = 0; i < NUMBER_OF_BYTES; i++) {
      const byteString = bits.slice(i * BITS_IN_BYTE, i * BITS_IN_BYTE + BITS_IN_BYTE);
      const byte = parseInt(byteString, 2);
      array[i] = byte;
    }
    return array;
  }

  public monobit(DEBUG = false): boolean {
    let numberOfOnes = 0;
    for (let i = 0; i < NUMBER_OF_BYTES; i++) {
      numberOfOnes += Tests.hammingWeightUint8Bit(this.bytes[i]);
    }
    if (DEBUG) {
      console.log(`There are ${numberOfOnes} one's`);
    }
    return numberOfOnes > MONOBIT_LOWER && numberOfOnes < MONOBIT_UPPER;
  }

  private static hammingWeightUint8Bit(b: number): number {
    if (b < 0 || b > 255) {
      throw new Error("It should be byte");
    }
    b = b - ((b >> 1) & 0x55);
    b = (b & 0x33) + ((b >> 2) & 0x33);
    return ((b + (b >> 4)) & 0x0F);
  }

  public poker(DEBUG = false): boolean {
    const f = new Array(16).fill(0);
    for (let i = 0; i < NUMBER_OF_BYTES; i++) {
      f[Tests.upperNibble(this.bytes[i])] += 1;
      f[Tests.lowerNibble(this.bytes[i])] += 1;
    }
    const sum = f.map(x => Math.pow(x, 2)).reduce((a, b) => a + b, 0);
    const X = (Math.pow(2, POKER_M) / POKER_K) * sum - POKER_K;
    if (DEBUG) {
      console.log(`X value: ${X}`);
    }
    return X > POKER_LOWER && X < POKER_UPPER;
  }

  private static upperNibble(x: number): number {
    return (x >> 4) & 0xF;
  }

  private static lowerNibble(x: number): number {
    return x & 0xF;
  }

  public runs(DEBUG = false): boolean {
    const zeroes: Record<number, number> = {};
    const ones: Record<number, number> = {};
    for (let i = 1; i <= 6; i++) {
      zeroes[i] = 0;
      ones[i] = 0;
    }
    let zeroCounter = 0;
    let oneCounter = 0;
    for (let i = 0; i < NUMBER_OF_BYTES; i++) {
      for (let j = 7; j >= 0; j--) {
        const bit = (this.bytes[i] & (1 << j)) ? 1 : 0;
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

    const isBetween = (x: number, lower: number, upper: number): boolean => x >= lower && x <= upper;
    if (Object.entries(zeroes).some(([key, value]) => !isBetween(value,
      RUNS_LOWER[Number(key) - 1], RUNS_UPPER[Number(key) - 1]))) {
      return false;
    }
    if (Object.entries(ones).some(([key, value]) => !isBetween(value,
      RUNS_LOWER[Number(key) - 1], RUNS_UPPER[Number(key) - 1]))) {
      return false;
    }
    return true;
  }

  public longRun(DEBUG = false): boolean {
    let zeroCounter = 0;
    let oneCounter = 0;
    for (let i = 0; i < NUMBER_OF_BYTES; i++) {
      for (let j = 7; j >= 0; j--) {
        const bit = (this.bytes[i] & (1 << j)) ? 1 : 0;
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

function randomDigit() {
  return Math.floor(Math.random() * Math.floor(2));
}

function generateRandomBinary() {
  let binary = "";
  for (let i = 0; i < NUMBER_OF_BITS; ++i) {
    binary += randomDigit();
  }
  return binary;
}

const get = (id: string) => document.getElementById(id);
const htmlBits = get("bits") as HTMLInputElement;
const htmlTest = get("test") as HTMLButtonElement;
const htmlGenerate = get("generate") as HTMLButtonElement;
const htmlError = get("error") as HTMLParagraphElement;
const htmlCheckboxMonobit = get("monobit") as HTMLInputElement;
const htmlStatusMonobit = get("status_monobit") as HTMLParagraphElement;
const htmlCheckboxPoker = get("poker") as HTMLInputElement;
const htmlStatusPoker = get("status_poker") as HTMLParagraphElement;
const htmlCheckboxRuns = get("runs") as HTMLInputElement;
const htmlStatusRuns = get("status_runs") as HTMLParagraphElement;
const htmlCheckboxLongRun = get("long_run") as HTMLInputElement;
const htmlStatusLongRun = get("status_long_run") as HTMLParagraphElement;
const htmlDebug = get("debug") as HTMLInputElement;

function formatPassed(passed: boolean, p: HTMLParagraphElement) {
  let color = passed ? "green" : "red";
  p.style.color = color;
  p.innerText = passed ? "passed" : "not passed";
}

function clearStatus() {
  htmlStatusMonobit.innerText = "";
  htmlStatusPoker.innerHTML = "";
  htmlStatusRuns.innerHTML = "";
  htmlStatusLongRun.innerHTML = "";
}

htmlTest.addEventListener(
  "click",
  function () {
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
      htmlError.innerText = (e as Error).message;
      clearStatus();
    }
  }
);
htmlGenerate.addEventListener(
  "click",
  function () {
    htmlBits.value = generateRandomBinary();
  }
);
export { };
