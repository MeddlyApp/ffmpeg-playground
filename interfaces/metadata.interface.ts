import { FfprobeStream } from "fluent-ffmpeg";

export interface MetadataFunctions {
  getFileMetadata: (src: string) => Promise<MetadataStreams>;
  returnVideoResolution: (file: string) => Promise<VideoResolution>;
}

export interface MetadataResolutions {
  resolution?: string;
  bandwidth?: string;
}

export interface MetadataStreams {
  videoStream: FfprobeStream | null;
  audioStream: FfprobeStream | null;
}

export interface VideoResolution {
  src: string;
  height: number;
  width: number;
  orientation: string;
  resolution: string;
}
