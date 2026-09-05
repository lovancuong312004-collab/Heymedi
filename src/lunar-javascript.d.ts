declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): any;
  }
  export class Lunar {
    static fromDate(date: Date): any;
    getDay(): number;
    getMonth(): number;
    getYear(): number;
  }
}
