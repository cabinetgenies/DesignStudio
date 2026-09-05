export type ImportedModelFormat = "dae" | "glb";

export interface ImportedModelSource {
  format: ImportedModelFormat;
  url: string;
  filename: string;
  checksum?: string;
}
