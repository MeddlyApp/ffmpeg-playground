import { VideoResolution } from "./metadata.interface";

export interface SplitVideo {
  src: string;
  startTime: number;
  endTime: number;
}

export interface CombineVideoItem {
  index: number;
  video: string;
  showBlur: boolean;
  startTime: number;
  duration: number;
}

export interface CombineVideos {
  audioFile: string;
  videos: CombineVideoItem[];
  orientation: string;
  outputFileName: string;
}

export interface CombineVideoSettings {
  orientation: string;
}

export interface VideoCombinePayload {
  videos: CombineVideoItem[];
  endFilePath: string;
  tmpDir: string;
}

export interface VideoFunctions {
  compressVideo: (src: string) => Promise<void>;
  trimVideoAndAudioToSame: (src: string) => Promise<void>;
  splitVideo: (vals: SplitVideo) => Promise<void>;
  mergeVideos: (payload: VideoCombinePayload) => Promise<string>;
  generateEmptyFrameVideoFile: (duration: number) => Promise<string>;
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
  addAudioSilenceToVideo: (x: string) => Promise<string>;
  mergeAudioToVideoSource: (
    audioSrc: string,
    videoSrc: string,
    standard: "Audio" | "Video"
  ) => Promise<string>;
}
