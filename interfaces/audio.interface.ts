export interface AudioFunctions {
  generateMP3FromMp4: (src: string) => Promise<void>;
  generateSilentAudioFile: (duration: number) => Promise<string>;
  spliceAudioFile: (
    src: string,
    spliceStart: number,
    duration: number
  ) => Promise<string>;
}
