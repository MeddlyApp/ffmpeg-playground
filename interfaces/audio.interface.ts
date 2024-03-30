export interface AudioFunctions {
  generateMP3FromMp4: (uri: string) => Promise<void>;
}
