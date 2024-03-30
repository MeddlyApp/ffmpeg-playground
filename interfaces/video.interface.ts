export interface SplitVideo {
  uri: string;
  startTime: number;
  endTime: number;
}

export interface CombineVideo {
  file1: string;
  file2: string;
  // startTime: number;
  // endTime: number;
}

export interface VideoFunctions {
  compressVideo: (uri: string) => void;
  splitVideo: (vals: SplitVideo) => Promise<void>;
  combineVideo: (vals: CombineVideo) => Promise<void>;
}
