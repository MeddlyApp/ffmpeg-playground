export interface SplitVideo {
  src: string;
  startTime: number;
  endTime: number;
}

export interface CombineVideo {
  video1: string;
  video2: string;
  orientation: string;
  showBlur: boolean;
}

export interface VideoFunctions {
  compressVideo: (src: string) => Promise<void>;
  splitVideo: (vals: SplitVideo) => Promise<void>;
  combineVideo: (vals: CombineVideo) => Promise<void>;
}
