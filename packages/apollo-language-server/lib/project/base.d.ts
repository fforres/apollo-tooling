import {
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode,
  DefinitionNode,
  GraphQLSchema
} from "graphql";
import {
  TextDocument,
  NotificationHandler,
  PublishDiagnosticsParams,
  Position
} from "vscode-languageserver";
import { GraphQLDocument } from "../document";
import { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import { ApolloConfig } from "../config";
import {
  GraphQLSchemaProvider,
  SchemaResolveConfig
} from "../providers/schema";
import { ApolloEngineClient, ClientIdentity } from "../engine";
export declare type DocumentUri = string;
export interface GraphQLProjectConfig {
  clientIdentity?: ClientIdentity;
  config: ApolloConfig;
  fileSet: FileSet;
  loadingHandler: LoadingHandler;
}
export interface TypeStats {
  service?: number;
  client?: number;
  total?: number;
}
export interface ProjectStats {
  type: string;
  loaded: boolean;
  serviceId?: string;
  types?: TypeStats;
  tag?: string;
  lastFetch?: number;
}
export declare abstract class GraphQLProject implements GraphQLSchemaProvider {
  schemaProvider: GraphQLSchemaProvider;
  protected _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;
  private _isReady;
  private readyPromise;
  protected engineClient?: ApolloEngineClient;
  private needsValidation;
  protected documentsByFile: Map<DocumentUri, GraphQLDocument[]>;
  config: ApolloConfig;
  schema?: GraphQLSchema;
  private fileSet;
  protected loadingHandler: LoadingHandler;
  protected lastLoadDate?: number;
  constructor({
    config,
    fileSet,
    loadingHandler,
    clientIdentity
  }: GraphQLProjectConfig);
  abstract get displayName(): string;
  protected abstract initialize(): Promise<void>[];
  abstract getProjectStats(): ProjectStats;
  get isReady(): boolean;
  get engine(): ApolloEngineClient;
  get whenReady(): Promise<void>;
  updateConfig(config: ApolloConfig): Promise<void>[];
  resolveSchema(config: SchemaResolveConfig): Promise<GraphQLSchema>;
  resolveFederatedServiceSDL(): Promise<string | void>;
  onSchemaChange(
    handler: NotificationHandler<GraphQLSchema>
  ): import("../providers/schema").SchemaChangeUnsubscribeHandler;
  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>): void;
  includesFile(uri: DocumentUri): boolean;
  scanAllIncludedFiles(): Promise<void>;
  fileDidChange(uri: DocumentUri): void;
  fileWasDeleted(uri: DocumentUri): void;
  documentDidChange(document: TextDocument): void;
  checkForDuplicateOperations(): void;
  private removeGraphQLDocumentsFor;
  protected invalidate(): void;
  private validateIfNeeded;
  abstract validate(): void;
  clearAllDiagnostics(): void;
  documentsAt(uri: DocumentUri): GraphQLDocument[] | undefined;
  documentAt(uri: DocumentUri, position: Position): GraphQLDocument | undefined;
  get documents(): GraphQLDocument[];
  get definitions(): DefinitionNode[];
  definitionsAt(uri: DocumentUri): DefinitionNode[];
  get typeSystemDefinitionsAndExtensions(): (
    | TypeSystemDefinitionNode
    | TypeSystemExtensionNode)[];
}
//# sourceMappingURL=base.d.ts.map
