/*/
 * RUN
/*/

import * as dotenv from "dotenv";
import audio from "./src/audio";
import image from "./src/image";
import playlist from "./src/m3u8-playlist";
import metadata from "./src/metadata";
import video from "./src/video";
import { CombineVideos } from "./interfaces/video.interface";
import combine from "./engines/combine";
dotenv.config();

// ************* RUN ************* //

async function run() {
  const file1: string = process?.env?.LOCAL_FILE_URI || "";
  const file2: string = process?.env?.LOCAL_FILE_URI2 || "";

  const audioFile: string = process?.env?.AUDIO_FILE_URI || "";

  // Pick and choose what you want to run here...

  // ************* GENERAL ************* //

  // await audio.generateMP3FromMp4(file1);
  // await image.generateGif(file1);
  // await playlist.generateVOD(file1, file2);
  // await metadata.getFileMetadata(file1);

  // ************* VIDEO ************* //

  // await video.compressVideo(file1);
  // await video.splitVideo({ src: file2, startTime: 1, endTime: 13 });
  // await video.addAudioSilenceToVideo(file1);
  // await video.generateEmptyFrameVideoFile(5);

  // ************* COMBINE VIDEOS ************* //

  const item1 = {
    index: 0,
    video: file1,
    showBlur: true,
    startTime: 0,
    duration: 5,
  };

  const item2 = {
    index: 1,
    video: file2,
    showBlur: true,
    startTime: 0,
    duration: 5,
  };

  const item3 = {
    index: 3,
    video: file1,
    showBlur: true,
    startTime: 0,
    duration: 5,
  };

  const videos = [item2, item1, item3];
  const orientation = "landscape"; // portrait | landscape
  const outputFileName = "concat.mp4";
  const params: CombineVideos = {
    videos,
    orientation,
    outputFileName,
    audioFile,
  };
  await combine.videos(params);

  //// Combine Video with New Audio Source
  // await video.mergeAudioToVideoSource(audioFile, file2, "Audio"); // Audio | Video

  // ************* AUDIO ************* //

  // await audio.spliceAudioFile(audioFile, 2.52, 3.2);

  console.log({ message: "Done" });
}

run();
