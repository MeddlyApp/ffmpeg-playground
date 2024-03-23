export interface M3U8Functions {
  generateVOD: (file1: string, file2: string) => void;
}

export interface M3U8Post {
  id: string;
  src: string;
  src1080p: string;
  src720p: string;
}

export interface M3U8GeneratedPaths {
  dirPath: string;
  outputDir: string;
  endFilePath: string;
}
