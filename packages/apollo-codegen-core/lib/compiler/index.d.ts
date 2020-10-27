import {
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  GraphQLCompositeType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  DocumentNode,
  TypeNode
} from "graphql";
export interface CompilerOptions {
  addTypename?: boolean;
  mergeInFieldsFromFragmentSpreads?: boolean;
  passthroughCustomScalars?: boolean;
  customScalarsPrefix?: string;
  namespace?: string;
  generateOperationIds?: boolean;
  operationIdsPath?: string;
  tsFileExtension?: string;
  useReadOnlyTypes?: boolean;
  suppressSwiftMultilineStringLiterals?: boolean;
  omitDeprecatedEnumCases?: boolean;
  exposeTypeNodes?: boolean;
}
export interface CompilerContext {
  schema: GraphQLSchema;
  typesUsed: GraphQLType[];
  operations: {
    [operationName: string]: Operation;
  };
  fragments: {
    [fragmentName: string]: Fragment;
  };
  options: CompilerOptions;
  unionTypes: GraphQLUnionType[];
  interfaceTypes: Map<
    GraphQLInterfaceType,
    (GraphQLObjectType | GraphQLInterfaceType)[]
  >;
}
export interface Operation {
  operationId?: string;
  operationName: string;
  operationType: string;
  variables: {
    name: string;
    type: GraphQLType;
    typeNode?: TypeNode;
  }[];
  filePath: string;
  source: string;
  sourceWithFragments?: string;
  rootType: GraphQLObjectType;
  selectionSet: SelectionSet;
}
export interface Fragment {
  filePath: string;
  fragmentName: string;
  source: string;
  type: GraphQLCompositeType;
  typeNode?: TypeNode;
  selectionSet: SelectionSet;
}
export interface SelectionSet {
  possibleTypes: GraphQLObjectType[];
  selections: Selection[];
}
export interface Argument {
  name: string;
  value: any;
  type?: GraphQLInputType;
  typeNode?: TypeNode;
}
export declare type Selection =
  | Field
  | TypeCondition
  | BooleanCondition
  | FragmentSpread;
export interface Field {
  kind: "Field";
  responseKey: string;
  name: string;
  alias?: string;
  args?: Argument[];
  type: GraphQLOutputType;
  typeNode?: TypeNode;
  description?: string;
  isDeprecated?: boolean;
  deprecationReason?: string;
  isConditional?: boolean;
  selectionSet?: SelectionSet;
}
export interface TypeCondition {
  kind: "TypeCondition";
  type: GraphQLCompositeType;
  typeNode?: TypeNode;
  selectionSet: SelectionSet;
}
export interface BooleanCondition {
  kind: "BooleanCondition";
  variableName: string;
  inverted: boolean;
  selectionSet: SelectionSet;
}
export interface FragmentSpread {
  kind: "FragmentSpread";
  fragmentName: string;
  isConditional?: boolean;
  selectionSet: SelectionSet;
}
export declare function stripProp(propName: string, obj: Object): any;
export declare function compileToIR(
  schema: GraphQLSchema,
  document: DocumentNode,
  options?: CompilerOptions
): CompilerContext;
//# sourceMappingURL=index.d.ts.map
