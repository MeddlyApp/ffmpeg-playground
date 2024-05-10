/*/
 * RUN
/*/

import * as dotenv from "dotenv";
import audio from "./src/audio";
import image from "./src/image";
import playlist from "./src/m3u8-playlist";
import metadata from "./src/metadata";
import video from "./src/video";
import { CombineVideoItem, CombineVideos } from "./interfaces/video.interface";
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
  // await video.splitVideo({ src: file2, spliceStart: 1, endTime: 13 });
  // await video.addAudioSilenceToVideo(file1);
  // await video.generateEmptyFrameVideoFile(5);
  // await video.trimVideoAndAudioToSame(file1);

  // ************* COMBINE VIDEOS ************* //

  const videos: CombineVideoItem[] = [
    {
      sequenceIndex: 0,
      spliceStart: 0,
      playDuration: 10,
      postId: "5cbf8101-5377-4c33-af20-56833b589567",
      src: file1,
      tmpSrc: "",
      queueEffects: [],
      type: "video",
      duration: 143.070893,
      orientation: "landscape",
      blurEdges: true,
    },
    {
      sequenceIndex: 1,
      spliceStart: 10,
      playDuration: 4,
      postId: "638239cc-386a-4ae1-b1f8-376461363e9e",
      src: file1,
      tmpSrc: "",
      queueEffects: [],
      type: "video",
      //duration: 61.681439,
      duration: 143.070893,
      orientation: "landscape",
      blurEdges: true,
    },
    {
      sequenceIndex: 2,
      spliceStart: 14,
      // playDuration: 129.070893,
      postId: "5cbf8101-5377-4c33-af20-56833b589567",
      src: file1,
      tmpSrc: "",
      queueEffects: [],
      type: "video",
      duration: 143.070893,
      orientation: "landscape",
      blurEdges: true,
    },
  ];

  const orientation = "landscape"; // portrait | landscape
  const timestamp = new Date().getTime();
  const outputFileName = `11b66d8b-d9ba-4ce1-a2e5-0ce15aa35ad4-TS${timestamp}.mp4`;
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

  console.log({ response: "Done" });
}

run();
