import { CombineVideos } from "./video.interface";

export interface VideoEngineFunctions {
  videos: (vals: CombineVideos) => Promise<void>;
}
