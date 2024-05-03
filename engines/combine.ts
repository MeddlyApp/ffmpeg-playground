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
  console.log({ message: startMsg });

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
    console.error({ message: error });
    return;
  }
  if (!audioStream || audioCodec !== "audio") {
    const error = "Error - Audio File: Must be an audio file.";
    console.error({ message: error });
    return;
  }

  const audioOkMsg = `File ${audioFile} is an audio file.`;
  console.log({ message: audioOkMsg });

  // ********** 2. See how many times each video source needs to be spliced: array of arrays **********

  // ********** 3. Splice each section **********

  // ********** 4. Confirm each splice has audio **********

  // ********** 5. Resize each video to final output dimensions and orientation **********
  const formattedVideos: CombineVideoItem[] =
    await video.formatVideosToStandard(outputResolution, videos);

  if (formattedVideos.length < 2) {
    const error =
      "Error - formattedVideos: Need at least 2 videos to combine output.";
    console.error({ message: error });
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

  const sortedVideos = formattedVideos.sort((a, b) => a.index - b.index);
  console.log({ message: "Start Combining Videos", videos: sortedVideos });

  if (sortedVideos.length < 2) {
    const error =
      "Error - sortedVideos: Need at least 2 videos to combine output.";
    console.error({ message: error });
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

  const response = await video.mergeVideos(combinePayload);

  // ********** 8. Add audio to newly combined single video **********

  // ********** 9. Delete Temporary Files **********

  for (const x of sortedVideos) {
    const { video } = x;
    console.log({ video: x });

    // Make sure video includes ../tmp/ in path
    if (!video.includes("../tmp/")) {
      const skip = `Skip deleting ${video} because it is not in tmp directory.`;
      console.log({ message: skip });
    } else {
      unlink(video, (err) => {
        if (err) {
          console.error({ message: `Error deleting ${video}:`, err });
        } else {
          console.log({ message: `${video} deleted successfully.` });
        }
      });
    }
  }

  const hasError = response === "";
  if (hasError) {
    console.error({ message: "Error combining videos." });
    return;
  }

  // ********** 10. Confirm everything is aligned properly **********

  const endMsg = `Engine Finished: Combined ${videos.length} Videos`;
  console.log({ message: endMsg });
}

const combine: VideoEngineFunctions = {
  videos: combineVideos,
};

export default combine;
