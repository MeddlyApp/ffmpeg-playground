export interface SplitVideo {
  src: string;
  startTime: number;
  endTime: number;
}

export interface VideoFunctions {
  compressVideo: (src: string) => Promise<void>;
  splitVideo: (vals: SplitVideo) => Promise<void>;
  combineVideo: (
    file1: string,
    file2: string,
    orientation: string
  ) => Promise<void>;
}
