// ************* UTILS.TS ************* //

import { VideoResolution } from "./metadata.interface";
import { CombineVideoItem } from "./video.interface";

export interface UtilityFunctions {
  logProgress: (x: number) => void;
  logError: (x: Error) => void;
  deleteTmpDirectory: (path: string) => Promise<void>;
  uploadAllFilesToCloud: (path: string) => Promise<void>;
}

// ************* VIDEO.TS ************* //

export interface VideoCombinePayload {
  videos: CombineVideoItem[];
  endFilePath: string;
  tmpDir: string;
}

export interface VideoUtilityFunctions {
  standardizeVideo: (
    x: VideoResolution,
    showBlur: boolean,
    tmpFilePath: string,
    finalResolution: string
  ) => Promise<string>;
  formatVideosToStandard: (
    outputResolution: string,
    videos: CombineVideoItem[]
  ) => Promise<CombineVideoItem[]>;
  combineVideos: (x: VideoCombinePayload) => Promise<string>;
  addAudioSilenceToVideo: (x: string) => Promise<string>;
}
