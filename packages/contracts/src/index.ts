import { z } from "zod";

/* ============================ Enums & typeextraction Patter ==================== */

export const SessionStatus = z.enum([
  "queued", // create, not started yet
  "running", // actively executing right now
  "idle", // nothing running - waiting
  "require_action", // agent hit approval gate
  "failed",
  "cancelled", // stopped by user
]);

export type SessionStatus = z.infer<typeof SessionStatus>;

//----------------- agent commands physical running

export const SandboxBackend = z.enum(["docker", "modal", "local", "none"]);

export type SandboxBackend = z.infer<typeof SandboxBackend>;

//--------------- how hard model is allowed to think

export const ReasoningEffort = z.enum([
  "none",
  "minimal",
  "low",
  "high",
  "xhigh",
]);

export type ReasoningEffort = z.infer<typeof ReasoningEffort>;

/* =================== Resources - what gets mounted into sandbox ================= */

//--------------- git repository the agent needs to work on.

export const RepositoryResourceRef = z.object({
  kind: z.literal("repository"),
  uri: z.string().min(1),
  ref: z.string().min(1),
  mountedPath: z.string().min(1).optional(), // wher it appears inside the sandbox
  subpath: z.string().min(1).optional(),
  githubInstallationId: z.number().int().positive().optional(),
  githubRepositoryId: z.number().int().positive().optional(),
});

export type RepositoryResourceRef = z.infer<typeof RepositoryResourceRef>;

// --------------- an uploaded file that agent needs to read

export const FileResourceRef = z.object({
  kind: z.literal("file"),
  fileId: z.uuid(),
  mountedPath: z.string().min(1).optional(),
});

export type FileResourceRef = z.infer<typeof FileResourceRef>;

export const ResourceRef = z.discriminatedUnion("kind", [
  RepositoryResourceRef,
  FileResourceRef,
]);

export type ResourceRef = z.infer<typeof ResourceRef>;

/* =================== File Uploads - the presigned-url  ================= */

// state of the stored file

export const FileStatus = z.enum([
  "pending_upload",
  "ready",
  "failed",
  "expired",
  "deleted",
]);

export type FileStatus = z.infer<typeof FileStatus>;

export const FileUploadStatus = z.enum([
  "pending",
  "completed",
  "expired",
  "failed",
]);

export type FileUploadStatus = z.infer<typeof FileUploadStatus>;

// A stored file

export const FileAsset = z.object({
  id: z.uuid(),
  status: FileStatus, // reuses the enum schema defined above as a field's type.
  fileName: z.string(),
  safeFilename: z.string(),
  contentType: z.string(), //"application/pdf"
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().nullable(),
  bucket: z.string(), // where in object store
  objectKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FileAsset = z.infer<typeof FileAsset>;

/* =================== Upload request/response types ================= */

// step 1. - the client's ask -> " I want to upload a file with this name"

export const CreateFileUploadRequest = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  sha256: z.string().min(1).optional(), // client may pre-declare the fingerprint
});

export type CreateFileUploadRequest = z.infer<typeof CreateFileUploadRequest>;

// step 2. - the server ans - "yes put it here"

export const CreateFileUploadResponse = z.object({
  fileId: z.uuid(),
  uploadId: z.uuid(),
  putUrl: z.url(),
  requiredHeaders: z.record(z.string(), z.string()),
  expiresAt: z.string(),
  maxSizeBytes: z.number().int().positive(),
});

export type CreateFileUploadResponse = z.infer<typeof CreateFileUploadResponse>;

// step 4 + 5 - client say "done" -> server verifies it landed

export const CompleteFileUploadResponse = z.object({
  file: FileAsset,
});

export type CompleteFileUploadResponse = z.infer<
  typeof CompleteFileUploadResponse
>;

export const FileDownloadUrlResponse = z.object({
  url: z.url(),
  expiresAt: z.string(),
});

export type FileDownloadUrlResponse = z.infer<typeof FileDownloadUrlResponse>;

/* =================== Document / RAG types ================= */

// lifecycle of a document being digested into searchable chunks

export const DocumentStatus = z.enum(["queued", "indexing", "ready", "failed"]);

export type DocumentStatus = z.infer<typeof DocumentStatus>;

// A collection

export const DocumentBase = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DocumentBase = z.infer<typeof DocumentBase>;

// one doc inside a collection, sourced from an upload file

export const Document = z.object({
  id: z.uuid(),
  baseId: z.uuid(),
  fileId: z.uuid(),
  status: DocumentStatus,
  title: z.string(),
  parser: z.string(), // which extractor ran : "pdf","markdown","html"
  chuckCount: z.number().int().nonnegative(), //how many chunks it was split into, once indexed.
  error: z.string().nullable(), // populated when status === "failed", otherwise null.
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Document = z.infer<typeof Document>;

// what agent receive from a search

export const DocumentSearchResult = z.object({
  chunkId: z.uuid(),
  documentId: z.uuid(),
  baseId: z.uuid(),
  fileId: z.uuid(),
  title: z.string(),
  text: z.string(), // the atual retieved text
  score: z.number(), // simolarity 0-1, from pgvector cosine distance
  chunkIndex: z.number().int().nonnegative(), // which piece of the doc - order matters for the context
  metadata: z.record(z.string(), z.unknown()), // side-car: page no., heading,...
});

export type DocumentSearchResult = z.infer<typeof DocumentSearchResult>;

export const CreateDocumentBaseRequest = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateDocumentBaseRequest = z.infer<
  typeof CreateDocumentBaseRequest
>;

export const AddDocumentRequest = z.object({ fileId: z.uuid() });

export type AddDocumentRequest = z.infer<typeof AddDocumentRequest>;

export const DocumentSearchRequest = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).default(5),
});
export type DocumentSearchRequest = z.infer<typeof DocumentSearchRequest>;

/* =================== Tools + merge logic ================= */

// --------------- 
export const ToolRef = z.object({
  kind: z.literal("mcp"),
  id: z.string().min(1), // which MCP server
});

export type ToolRef = z.infer<typeof ToolRef>;

export class ResourceRefConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceRefConflictError";
  }
}

export function mergeToolRefs(
  existing: ToolRef[],
  additions: ToolRef[],
): ToolRef[] {
  const seen = new Set<string>();
  const out: ToolRef[] = [];
  for (const tool of [...existing, ...additions]) {
    const key = `${tool.kind}:${tool.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(tool);
  }
  return out;
}