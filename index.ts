/*/
 * RUN
/*/

import * as dotenv from "dotenv";
import audio from "./src/audio";
import image from "./src/image";
import playlist from "./src/m3u8-playlist";
import metadata from "./src/metadata";
import video from "./src/video";
import videoUtil from "./utils/video";
import { CombineVideos } from "./interfaces/video.interface";
dotenv.config();

// ************* RUN ************* //

async function run() {
  const file1: string = process?.env?.LOCAL_FILE_URI || "";
  const file2: string = process?.env?.LOCAL_FILE_URI2 || "";

  const audioFile: string = process?.env?.AUDIO_FILE_URI || "";

  // Pick and choose what you want to run here...

  // await audio.generateMP3FromMp4(file1);
  // await image.generateGif(file1);
  // await playlist.generateVOD(file1, file2);
  // await metadata.getFileMetadata(file1);

  // await video.compressVideo(file1);
  // await video.splitVideo({ src: file2, startTime: 1, endTime: 13 });

  // await videoUtil.addAudioSilenceToVideo(file1);

  //// Combine Videos
  //const item1 = { index: 0, video: file1, showBlur: true };
  //const item2 = { index: 1, video: file2, showBlur: true };
  //const videos = [item2, item1];
  //const orientation = "landdscape"; // portrait | landscape
  //const outputFileName = "concat.mp4";
  //const params: CombineVideos = { videos, orientation, outputFileName };
  //await video.combineVideos(params);

  // Combine Video with New Audio Source

  await videoUtil.mergeAudioToVideoSource(audioFile, file2, "Audio"); // Audio | Video

  console.log({ message: "Done" });
}

run();
