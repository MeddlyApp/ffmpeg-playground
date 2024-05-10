import { VideoResolution } from "./metadata.interface";

export interface SplitVideo {
  sequenceIndex: number;
  spliceStart: number;
  playDuration: number;
  src: string;
}

export interface CombineVideoItem {
  sequenceIndex: number;
  spliceStart: number;
  playDuration?: number;
  postId: string;
  src: string;
  tmpSrc: string;
  queueEffects: any[];
  type: string;
  duration: number;
  orientation: string;
  blurEdges: boolean;
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
  splitVideo: (vals: SplitVideo) => Promise<string>;
  mergeVideos: (payload: VideoCombinePayload) => Promise<string>;
  generateEmptyFrameVideoFile: (duration: number) => Promise<string>;
  standardizeVideo: (
    x: VideoResolution,
    blurEdges: boolean,
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
