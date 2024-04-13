export interface SplitVideo {
  src: string;
  startTime: number;
  endTime: number;
}

export interface CombineVideoItem {
  index: number;
  video: string;
  showBlur: boolean;
}

export interface CombineVideos {
  videos: CombineVideoItem[];
  orientation: string;
  outputFileName: string;
}

export interface CombineVideoSettings {
  orientation: string;
}

export interface VideoFunctions {
  compressVideo: (src: string) => Promise<void>;
  splitVideo: (vals: SplitVideo) => Promise<void>;
  combineVideos: (vals: CombineVideos) => Promise<void>;
}
