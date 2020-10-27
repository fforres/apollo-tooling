import { LegacyCompilerContext } from "./compiler/legacyIR";
import { CompilerContext } from "./compiler";
interface serializeOptions {
  exposeTypeNodes: boolean;
}
export default function serializeToJSON(
  context: LegacyCompilerContext | CompilerContext,
  options?: serializeOptions
): string;
export declare function serializeAST(ast: any, space?: string): string;
export {};
//# sourceMappingURL=serializeToJSON.d.ts.map
