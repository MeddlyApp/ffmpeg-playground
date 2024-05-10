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
  const outputFileName = "concat.mp4";
  const params: CombineVideos = {
    videos,
    orientation,
    outputFileName,
    audioFile,
  };
  await combine.videos(params);

  // NEW

  /*
  // Input video file path
  const inputFilePath = videos[0].src;

  // Output file paths for the three parts
  const part1FilePath = "../tmp/part1.mp4";
  const part2FilePath = "../tmp/part2.mp4";
  const part3FilePath = "../tmp/part3.mp4";

  // Output file path for the final combined video
  const combinedFilePath = "combined.mp4";

  // Duration of the original video
  let videoDuration = 0;

  // Step 1: Split the original clip into three parts
  ffmpeg.ffprobe(inputFilePath, function (err, metadata) {
    if (err) {
      console.error("Error while probing the input file:", err);
      return;
    }
    if (metadata?.format?.duration) videoDuration = metadata?.format?.duration;

    // Calculate the duration for each part
    const partDuration = videoDuration / 3;

    // Part 1
    ffmpeg(inputFilePath)
      .setStartTime(0)
      .setDuration(partDuration)
      .output(part1FilePath)
      .on("end", function () {
        console.log("Part 1 completed");
        // Part 2
        ffmpeg(inputFilePath)
          .setStartTime(partDuration)
          .setDuration(partDuration)
          .output(part2FilePath)
          .on("end", function () {
            console.log("Part 2 completed");
            // Part 3
            ffmpeg(inputFilePath)
              .setStartTime(partDuration * 2)
              .setDuration(partDuration)
              .output(part3FilePath)
              .on("end", function () {
                console.log("Part 3 completed");

                // Step 2: Combine the three parts in the original order
                ffmpeg()
                  .input(part1FilePath)
                  .input(part2FilePath)
                  .input(part3FilePath)
                  .inputOptions(
                    "-filter_complex",
                    "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]"
                  )
                  .outputOptions("-map", "[outv]", "-map", "[outa]")
                  .output(combinedFilePath)
                  .on("end", function () {
                    console.log("Combining completed");
                  })
                  .run();
              })
              .run();
          })
          .run();
      })
      .run();
  });
  */

  //// Combine Video with New Audio Source
  // await video.mergeAudioToVideoSource(audioFile, file2, "Audio"); // Audio | Video

  // ************* AUDIO ************* //

  // await audio.spliceAudioFile(audioFile, 2.52, 3.2);

  console.log({ response: "Done" });
}

run();
