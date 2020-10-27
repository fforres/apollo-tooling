import * as t from "@babel/types";
declare type Printable = t.Node | string;
export default class Printer {
  private printQueue;
  print(): string;
  enqueue(printable: Printable): void;
  printAndClear(): string;
  private fixCommas;
}
export {};
//# sourceMappingURL=printer.d.ts.map
