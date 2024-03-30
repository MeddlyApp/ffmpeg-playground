export interface MetadataFunctions {
  getFileMetadata: (uri: string) => Promise<void>;
}

export interface MetadataResolutions {
  resolution?: string;
  bandwidth?: string;
}
