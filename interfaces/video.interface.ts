export interface VideoFunctions {
  compressVideo: (uri: string) => void;
  splitVideo: (uri: string) => void;
  combineVideo: (file1: string, file2: string) => void;
}
