export interface UtilityFunctions {
  logProgress: (x: number) => void;
  logError: (x: Error) => void;
  deleteTmpDirectory: (path: string) => Promise<void>;
  uploadAllFilesToCloud: (path: string) => Promise<void>;
}
