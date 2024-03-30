// ************* UTILS.TS ************* //

import { VideoResolution } from "./metadata.interface";

export interface UtilityFunctions {
  logProgress: (x: number) => void;
  logError: (x: Error) => void;
  deleteTmpDirectory: (path: string) => Promise<void>;
  uploadAllFilesToCloud: (path: string) => Promise<void>;
}

// ************* VIDEO.TS ************* //

export interface VideoCombinePayload {
  video1: string;
  video2: string;
  endFilePath: string;
  tmpDir: string;
}

export interface VideoUtilityFunctions {
  standardizeVideo: (
    x: VideoResolution,
    tmpFilePath: string,
    finalResolution: string
  ) => Promise<string>;
  combineVideos: (x: VideoCombinePayload) => Promise<string>;
}
