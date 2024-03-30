export interface SplitVideo {
  uri: string;
  startTime: number;
  endTime: number;
}

export interface VideoFunctions {
  compressVideo: (uri: string) => Promise<void>;
  splitVideo: (vals: SplitVideo) => Promise<void>;
  combineVideo: (file1: string, file2: string) => Promise<void>;
}
