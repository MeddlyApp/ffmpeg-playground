import { FfprobeStream } from "fluent-ffmpeg";

export interface MetadataFunctions {
  getFileMetadata: (uri: string) => Promise<MetadataStreams>;
}

export interface MetadataResolutions {
  resolution?: string;
  bandwidth?: string;
}

export interface MetadataStreams {
  videoStream: FfprobeStream | null;
  audioStream: FfprobeStream | null;
}
