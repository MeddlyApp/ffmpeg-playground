// ***** AUTO-GENERATING SINGLE VIDEO FROM MULTI-CAM WITH SINGLE AUDIO ***** //

// 0. Setup Arguments
// 1. Confirm audio source format
// 2. See how many times each video source needs to be spliced: array of arrays
// 3. Splice each section
// 4. Confirm each splice has audio
// 5. Resize each video to final output dimensions and orientation
// 6. Combine all videos into a single video output
// 7. Add audio to newly combined single video
// 8. Confirm everything is aligned properly

import { unlink } from "node:fs";
import video from "../src/video";
import {
  CombineVideoItem,
  CombineVideos,
  VideoCombinePayload,
} from "../interfaces/video.interface";
import { VideoEngineFunctions } from "../interfaces/engines.interface";
import metadata from "../src/metadata";

async function combineVideos(vals: CombineVideos): Promise<void> {
  let { audioFile, videos, outputFileName, orientation } = vals;

  const startMsg = `Engine Starting: Combining ${videos.length} Videos`;
  console.log({ response: startMsg });

  // ********** 0. Setup Arguments **********

  if (orientation !== "portrait") orientation = "landscape";
  const portraitHDResolution = "1080x1920";
  const landscapeHDResolution = "1920x1080";

  const outputResolution =
    orientation === "portrait" ? portraitHDResolution : landscapeHDResolution;

  // ********** 1. Confirm audio source format **********

  const audioFormat = await metadata.getFileMetadata(audioFile);
  const audioStream = audioFormat?.audioStream;
  const audioVideoStream = audioFormat?.videoStream;
  const audioCodec = audioStream?.codec_type || "";
  if (audioVideoStream) {
    const error = "Error - Audio File: Must be an audio file.";
    console.error({ response: error });
    return;
  }
  if (!audioStream || audioCodec !== "audio") {
    const error = "Error - Audio File: Must be an audio file.";
    console.error({ response: error });
    return;
  }

  const audioOkMsg = `File ${audioFile} is an audio file.`;
  console.log({ response: audioOkMsg });

  // ********** 3. Splice each section **********

  let spliceArray: CombineVideoItem[] = [];

  await Promise.all(
    videos.map(async (x: CombineVideoItem) => {
      const { sequenceIndex, spliceStart, src } = x;

      const dur = x.playDuration || 0;
      const playDuration = parseFloat(dur.toFixed(3));
      const splicePayload = { sequenceIndex, spliceStart, playDuration, src };
      const splicedVideo: string = await video.splitVideo(splicePayload);

      const wasSuccessful = splicedVideo !== "";
      if (!wasSuccessful) {
        // Error handling
        const error = `Error - Splice Failed: ${src}`;
        console.error({ response: error });
        return;
      }

      x = { ...x, src: splicedVideo };
      spliceArray.push(x);
      return;
    })
  );

  // ********** 4. Confirm each splice has audio **********

  // ********** 5. Resize each video to final output dimensions and orientation **********

  const formattedVideos: CombineVideoItem[] =
    await video.formatVideosToStandard(outputResolution, spliceArray);

  if (formattedVideos.length < 2) {
    const error =
      "Error - formattedVideos: Need at least 2 videos to combine output.";
    console.error({ response: error });
    return;
  }

  // ********** 6. Format Final Output File Name **********

  const filename = outputFileName.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}.mp4`;
  const tmpDir: string = `../tmp`;
  const endFilePath: string = `${tmpDir}/${finalname}`;

  // ********** 7. Combine all videos into a single video output **********

  const sortedVideos = formattedVideos.sort(
    (a, b) => a.sequenceIndex - b.sequenceIndex
  );
  const sequenceId: string = "squenenceId";
  console.log({
    response: `Start Combining Videos for Sequence: ${sequenceId}`,
  });

  if (sortedVideos.length < 2) {
    const error =
      "Error - sortedVideos: Need at least 2 videos to combine output.";
    console.error({ response: error });
    return;
  }

  // Notes:
  // - if the video has no audio, copying the audio in current
  //   function combineVideos will move the other file's
  //   audio up. We need to add silence to the video with no audio
  // - also need to account for showBlur in CombineVideoItem in the
  //   formatVideosToStandard function above. Use argument
  //   values to set upsale / orientation filters.

  const combinePayload: VideoCombinePayload = {
    videos: sortedVideos,
    endFilePath,
    tmpDir,
  };

  const videoResponse: string = await video.mergeVideos(combinePayload);

  if (videoResponse === "") {
    const error = "Error - Merge Videos Response: Error";
    console.error({ response: error });
    return;
  }

  // ********** 8. Delete Additional Temporary Files **********

  for (const x of sortedVideos) {
    const { src, sequenceIndex } = x;
    // Make sure video includes ../tmp/ in path
    if (!src.includes("-part.mp4")) {
      const skip = `Skip deleting Index ${sequenceIndex} because it is not a tmp file.`;
      console.log({ response: skip });
    } else {
      await new Promise((resolve) => {
        unlink(src, (err) => {
          if (err) {
            console.error({
              response: `Error Deleting Sequence Index: ${sequenceIndex}`,
              body: err,
            });
            resolve("");
          } else {
            console.log({
              response: `Successfully Deleted Squence Index: ${sequenceIndex}`,
            });
            resolve("");
          }
        });
      });
    }
  }

  // ********** 9. Add audio to newly combined single video **********

  const response: string = await video.mergeAudioToVideoSource(
    audioFile,
    videoResponse,
    "Audio"
  );

  if (response === "") {
    const error = "Error - Video Merge Audio Response: Error.";
    console.error({ response: error });
    return;
  }

  // Delete TMP File and Rename Response to finalname

  // await new Promise((resolve) => {
  //   unlink(videoResponse, (err) => {
  //     if (err) {
  //       console.error({
  //         response: "Error Deleting Video Response",
  //         body: err,
  //       });
  //       resolve("");
  //     } else {
  //       console.log({ response: "Successfully Deleted Video Response" });
  //       resolve("");
  //     }
  //   });
  // });

  // await metadata.renameFile(response, finalname);

  const hasError = response === "";
  if (hasError) {
    console.error({ response: "Error combining videos." });
    return;
  }

  // ********** 10. Confirm everything is aligned properly **********

  const endMsg = `Engine Finished: Combined ${sortedVideos.length} Videos`;
  console.log({ response: endMsg });
}

const combine: VideoEngineFunctions = {
  videos: combineVideos,
};

export default combine;
