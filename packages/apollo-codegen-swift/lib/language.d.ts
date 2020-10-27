import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
export interface Class {
  className: string;
  modifiers: string[];
  superClass?: string;
  adoptedProtocols?: string[];
}
export interface Struct {
  structName: string;
  adoptedProtocols?: string[];
  description?: string;
  namespace?: string;
}
export interface Protocol {
  protocolName: string;
  adoptedProtocols?: string[];
}
export interface Property {
  propertyName: string;
  typeName: string;
  isOptional?: boolean;
  description?: string;
}
export declare class SwiftSource {
  source: string;
  constructor(source: string);
  static string(string: string, trim?: boolean): SwiftSource;
  static multilineString(string: string): SwiftSource;
  static identifier(input: string): SwiftSource;
  static memberName(input: string): SwiftSource;
  static isValidParameterName(input: string): boolean;
  static raw(
    literals: TemplateStringsArray,
    ...placeholders: any[]
  ): SwiftSource;
  toString(): string;
  concat(...sources: SwiftSource[]): SwiftSource;
  append(...sources: SwiftSource[]): void;
  static wrap(
    start: SwiftSource,
    maybeSource?: SwiftSource,
    end?: SwiftSource
  ): SwiftSource | undefined;
  static join(
    maybeArray?: (SwiftSource | undefined)[],
    separator?: string
  ): SwiftSource | undefined;
}
export declare function swift(
  literals: TemplateStringsArray,
  ...placeholders: any[]
): SwiftSource;
export declare class SwiftGenerator<Context> extends CodeGenerator<
  Context,
  {
    typeName: string;
  },
  SwiftSource
> {
  constructor(context: Context);
  multilineString(
    string: string,
    suppressMultilineStringLiterals: Boolean
  ): void;
  comment(comment?: string, trim?: Boolean): void;
  deprecationAttributes(
    isDeprecated: boolean | undefined,
    deprecationReason: string | undefined
  ): void;
  namespaceDeclaration(namespace: string | undefined, closure: Function): void;
  namespaceExtensionDeclaration(
    namespace: string | undefined,
    closure: Function
  ): void;
  classDeclaration(
    { className, modifiers, superClass, adoptedProtocols }: Class,
    closure: Function
  ): void;
  structDeclaration(
    { structName, description, adoptedProtocols, namespace }: Struct,
    outputIndividualFiles: boolean,
    closure: Function
  ): void;
  propertyDeclaration({ propertyName, typeName, description }: Property): void;
  propertyDeclarations(properties: Property[]): void;
  protocolDeclaration(
    { protocolName, adoptedProtocols }: Protocol,
    closure: Function
  ): void;
  protocolPropertyDeclaration({ propertyName, typeName }: Property): void;
  protocolPropertyDeclarations(properties: Property[]): void;
}
//# sourceMappingURL=language.d.ts.map
