/*/
 * COMPRESS VIDEO
 * SPLIT VIDEO
 * COMBINE VIDEO
 * UTILITIES
/*/

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import utils from "../utils/utils";
import {
  CombineVideoItem,
  SplitVideo,
  VideoFunctions,
  VideoCombinePayload,
} from "../interfaces/video.interface";
import metadata from "./metadata";
import { VideoResolution } from "../interfaces/metadata.interface";

// ************* COMPRESS VIDEO ************* //

async function compressVideo(src: string): Promise<void> {
  console.log({ message: "Start Compressing MP4" });
  const filename: string = src.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const finalname: string = `${name}-compressed.mp4`;
  const endFilePath: string = `../tmp/${finalname}`;

  const response = await new Promise((resolve) => {
    return ffmpeg(src)
      .videoCodec("libx264")
      .outputOptions([
        "-crf 20", // 0 is lossless, 18 is lossy, 23 is default, 51 is worst quality
        "-c:a copy",
      ])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", (e, stdout, stderr) => resolve(endFilePath))
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .save(endFilePath);
  });

  const hasError = response === "";
  if (hasError) {
    console.error({ message: "Error compressing video." });
    return;
  }

  console.log({ message: "End Compressing MP4" });
  return;
}

// ************* SPLIT VIDEO ************* //

async function splitVideo(vals: SplitVideo): Promise<void> {
  console.log({ message: "Start Splitting MP4" });
  const { src, startTime, endTime } = vals;
  const filename = src.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const outputfile1: string = `${name}-split-part.mp4`;
  const outputfile2: string = `${name}-split-final.mp4`;
  const endFilePath1: string = `../tmp/${outputfile1}`;
  const endFilePath: string = `../tmp/${outputfile2}`;

  // Split the end of the video first
  const response = await new Promise((resolve) => {
    ffmpeg(src)
      .setStartTime(0)
      .setDuration(endTime)
      .outputOptions("-c copy")
      .videoCodec("libx264")
      .outputOptions([
        "-crf 20", // 0 is lossless, 18 is lossy, 23 is default, 51 is worst quality
        "-c:a copy",
      ])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => {
        console.log({
          message: `First part of the video saved as ${outputfile1}`,
        });

        // Then cut out the beginning by offsetting startTime
        // to get the selected section of video
        ffmpeg(src)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .outputOptions("-c copy")
          .videoCodec("libx264")
          .on("progress", ({ percent }) => utils.logProgress(percent))
          .on("end", () => {
            console.log({
              message: `Second part of the video saved as ${outputfile2}`,
            });
            // Delete temporary files
            fs.unlink(endFilePath1, (err) => {
              if (err) {
                console.error({
                  message: `Error deleting ${outputfile1}:`,
                  err,
                });
                resolve("");
              } else {
                console.log({
                  message: `${outputfile1} deleted successfully.`,
                });
                resolve(endFilePath);
              }
            });
          })
          .on("error", (e, stdout, stderr) => {
            utils.logError(e);
            resolve("");
          })
          .save(endFilePath);
      })
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .save(endFilePath1);
  });

  const hasError = response === "";
  if (hasError) {
    console.error("Error splitting video.");
    return;
  }

  console.log({ message: "End Splitting MP4" });
  return;
}

// ************* COMBINE VIDEO ************* //

async function mergeVideos(values: VideoCombinePayload): Promise<string> {
  const { videos, endFilePath, tmpDir } = values;

  const command = ffmpeg();
  videos.forEach((x: CombineVideoItem) => command.input(x.video));

  const response = await new Promise((resolve) => {
    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .on("progress", ({ percent }) => utils.logProgress(percent / 2))
      .on("end", (e, stdout, stderr) => {
        console.log({ message: "End Combining two MP4's" });
        resolve("Complete");
      })
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .mergeToFile(endFilePath, tmpDir); // Merge and save to the output file
  });

  const hasError = response === "";
  if (hasError) return "";
  return endFilePath;
}

// ************* UTILITIES ************* //

async function generateEmptyFrameVideoFile(duration: number): Promise<string> {
  const message = `Generating Empty Frame Video File for ${duration} seconds.`;
  console.log({ message: `Start ${message}` });
  const timestamp = new Date().getTime();
  const tmpFilePath = `../tmp/video-void-${timestamp}.mp4`;
  const response: string = await new Promise((resolve) => {
    ffmpeg()
      .input("color=black:s=1920x1080")
      .inputOptions("-f lavfi")
      .outputOptions(`-t ${duration}`)
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => resolve("output.mp4"))
      .on("error", (err) => {
        utils.logError(err);
        resolve("");
      })
      .saveToFile(tmpFilePath);
  });

  const hasError = response === "";
  if (hasError) {
    console.error({ message: "Error generating empty frame video file." });
    return "";
  }

  console.log({ message: `Completed ${message}` });
  return response;
}

async function standardizeVideo(
  values: VideoResolution,
  showBlur: boolean,
  tmpFilePath: string,
  finalResolution: string
): Promise<string> {
  const { src } = values;
  const finalWidth = finalResolution.split("x")[0];
  const finalHeight = finalResolution.split("x")[1];

  const response: string = await new Promise(async (resolve) => {
    let finalOrientation: string = "";
    if (finalHeight > finalWidth) finalOrientation = "portrait";
    else finalOrientation = "landscape";
    const isPortrait = finalOrientation === "portrait";

    const sourceVideoOrientation = values.orientation;
    const sourceIsPortrait = sourceVideoOrientation === "portrait";

    // Scale Options
    const scalePortrait = `[0:v]scale=-1:ih*9/16`;
    const scaleLandscape = `[0:v]scale=ih*16/9:-1`;
    let scale = isPortrait ? scalePortrait : scaleLandscape;
    if (!sourceIsPortrait) scale = `[0:v]scale=${finalWidth}:-2`;

    // Background Options
    const pboxblur = `boxblur=luma_radius=min(h\\,w)/20`;
    const lumapower = `luma_power=1`;
    const chromaradius = `chroma_radius=min(cw\\,ch)/20`;
    const hchromapower = `chroma_power=1[bg]`;

    const portraitblur = `${pboxblur}:${lumapower}:${chromaradius}:${hchromapower}`;
    const portraitblack = `drawbox=c=black:t=fill[bg]`;
    const portraitBackground = showBlur ? portraitblur : portraitblack;

    // const horizontalblur = `${pboxblur}:${lumapower}:${chromaradius}:${hchromapower}`;
    const horizontalblack = `pad=${finalWidth}:${finalHeight}:(ow-iw)/2:(oh-ih)/2:black`;
    const horizontalBackground = horizontalblack; // showBlur ? horizontalblur : horizontalblack;

    const background = sourceIsPortrait
      ? portraitBackground
      : horizontalBackground;

    // Overlay Options
    const horizontaloverlay = `[bg][0:v]overlay=(W-w)/2:(H-h)/2`;
    const verticaloverlay = `[bg][0:v]overlay=(W-w)/2:(H-h)/2`;
    const overlay = sourceIsPortrait ? verticaloverlay : horizontaloverlay;

    // Crop Options
    const cropPortrait = `crop=w=ih*9/16:h=ih,scale=${finalWidth}:${finalHeight}`;
    const cropLandscape = `crop=h=iw*9/16,scale=${finalWidth}:${finalHeight}`;
    const crop = isPortrait ? cropPortrait : cropLandscape;

    // Combine Options
    const standard = `${scale},${background}`;
    const overlayCrop = sourceIsPortrait
      ? `${overlay},${crop}`
      : showBlur
        ? "" // `${overlay},${crop}` // BUG! show blur + landscape to horizontal
        : "";
    const options = `${standard};${overlayCrop}`;

    console.log({
      message: "Set Standardization FFMPEG Options",
      body: options,
    });

    const convert = ffmpeg(src);
    convert
      .inputOptions(["-lavfi", options])
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => resolve(tmpFilePath))
      .on("error", (err) => {
        utils.logError(err);
        resolve("");
      })
      .save(tmpFilePath);
  });

  const hasError = response === "";
  if (hasError) return "";

  return response;
}

async function formatVideosToStandard(
  outputResolution: string,
  videos: CombineVideoItem[]
) {
  // // 1. Make sure files are the desired resolution
  const outputVideos: CombineVideoItem[] = [];

  for (const x of videos) {
    let { video } = x;
    const { index, showBlur, startTime, duration } = x;

    let videoData = await metadata.returnVideoResolution(video);
    const { resolution } = videoData;

    const videoIsOutputResolution = resolution === outputResolution;
    const videoStreams = await metadata.getFileMetadata(video);
    const videoHasAudioStream = videoStreams?.audioStream ? true : false;
    console.log({ videoHasAudioStream });

    if (!videoHasAudioStream) {
      const warn = `Video does not have an audio stream. Add blank audio ${index}`;
      console.warn({ message: warn });

      video = await addAudioSilenceToVideo(video);
      videoData = await metadata.returnVideoResolution(video);
    }

    if (!videoIsOutputResolution) {
      const warn = `Video is not the same resolution. Updating ${index}`;
      console.warn({ message: warn });

      const videoName = video.split("/").pop() || "";
      const videoExt = videoName.split(".").pop() || "";
      const filename = videoName.replace(`.${videoExt}`, "");
      const tmpFilePath: string = `../tmp/${filename}-formatted.mp4`;

      await standardizeVideo(
        videoData,
        showBlur,
        tmpFilePath,
        outputResolution
      );

      outputVideos.push({
        index,
        video: tmpFilePath,
        showBlur,
        startTime,
        duration,
      });
      const output = `Video ${index} filepath updated: ${tmpFilePath}`;
      console.log({ message: output });
    } else {
      outputVideos.push({ index, video, showBlur, startTime, duration });
    }
  }

  return outputVideos;
}

async function addAudioSilenceToVideo(video: string): Promise<string> {
  const message = "Generating Silent Audio Stream";
  const videoName = video.split("/").pop() || "";
  const videoExt = videoName.split(".").pop() || "";
  const filename = videoName.replace(`.${videoExt}`, "");
  const tmpFilePath: string = `../tmp/${filename}-audio.mp4`;

  const videoStreams = await metadata.getFileMetadata(video);
  const duration = videoStreams?.videoStream?.duration || 0;

  console.log({ message: `Duration of video is ${duration}` });
  console.log({ message: `Started ${message}` });

  const response: string = await new Promise((resolve) => {
    ffmpeg(video)
      .input("anullsrc")
      .inputFormat("lavfi")
      .duration(duration)
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => {
        console.log({ message: `Completed ${message}` });
        resolve("Success");
      })
      .on("error", (err) => {
        console.error("Error generating silent audio stream:", err);
        resolve("");
      })
      .save(tmpFilePath);
  });

  const hasError = response === "";
  if (hasError) return "";

  const newMetadata = await metadata.getFileMetadata(tmpFilePath);
  const hasAudioStream = newMetadata?.audioStream ? true : false;
  if (!hasAudioStream) {
    console.error("Error: Video does not have an audio stream");
    return "";
  } else {
    console.log({ message: "Success: Video has an audio stream" });
  }

  return tmpFilePath;
}

async function mergeAudioToVideoSource(
  audioSrc: string,
  videoSrc: string,
  standard: "Audio" | "Video"
): Promise<string> {
  const message = `Merging Audio and Video Source with ${standard} standardization`;
  console.log({
    message: `Start ${message}`,
    body: { audioSrc, videoSrc, standardization: standard },
  });

  const alignToAudio = standard === "Audio";
  const alignToVideo = standard === "Video";

  // 1. Confirm Audio File is Audio

  const srcAudioStreams = await metadata.getFileMetadata(audioSrc);
  if (!srcAudioStreams?.audioStream) {
    const errMsg = "Error: Audio file does not have an audio stream";
    console.error({ status: 400, message: errMsg });
    return "";
  }
  if (srcAudioStreams?.videoStream) {
    const errMsg = "Error: Audio file has a video stream";
    console.error({ status: 400, message: errMsg });
    return "";
  }

  // 2. Confirm Video File is Video

  const srcVideoStreams = await metadata.getFileMetadata(videoSrc);
  if (!srcVideoStreams?.videoStream) {
    const errMsg = "Error: Video file does not have a video stream";
    console.error({ status: 400, message: errMsg });
    return "";
  }

  // Standard: Audio Duration
  // Standard: Video Duration

  // 3. Check if audio is longer than video
  //    If so, fill the video with black frames
  //    - Calculate difference in duration
  //    - Generate a video black frames for the difference
  //    - After the original video, add the black frame video

  //    If not, fill the audio with silence
  //    - Calculate difference in duration
  //    - Generate a silent audio file for the difference
  //    - After the original audio, add the silent audio

  const audioDuration = srcAudioStreams?.audioStream?.duration || "0";
  const audioLength = parseFloat(audioDuration);

  const videoDuration = srcVideoStreams?.videoStream?.duration || "0";
  const videoLength = parseFloat(videoDuration);

  console.log({
    message: `Video Duration is ${videoLength.toFixed(3)} seconds. Audio Duration is ${audioLength.toFixed(3)} seconds.`,
  });

  const audioStdDeviation = 0.5;
  const videoStdDeviation = 0.5;
  const audioIsLongerThanVideo = audioLength > videoLength;

  if (audioIsLongerThanVideo) {
    console.log({
      message: `Audio is longer than video by ${(audioLength - videoLength).toFixed(3)} seconds`,
    });
    //  // const newVideo: string = await addBlackFramesToVideo(videoSrc, audioDuration);
    //  // videoSrc = newVideo;

    const diff = audioLength - videoLength;
    if (diff < audioStdDeviation) {
      console.log({ message: "Audio: Ok" });
    } else {
      console.log({ message: "Audio is outside standard deviation" });
      if (alignToAudio) {
        console.log({
          message: `Start Audio Standardization: Adding ${(audioLength - videoLength).toFixed(3)} seconds of blank frames to video.`,
        });
      } else if (alignToVideo) {
        console.log({
          message: `Start Video Standardization: Cutting audio at ${videoLength.toFixed(3)} seconds.`,
        });
      }
    }
  } else {
    console.log({
      message: `Video is longer than audio by ${(videoLength - audioLength).toFixed(3)} seconds.`,
    });
    //  // const newAudio: string = await addSilentAudioToVideo(audioSrc, videoDuration);
    //  // audioSrc = newAudio;

    const diff = videoLength - audioLength;
    if (diff < videoStdDeviation) {
      console.log({ message: "Video: Ok" });
    } else {
      console.log({ message: "Video is outside standard deviation" });

      if (alignToAudio) {
        console.log({
          message: `Start Audio Standardization: Cutting video at  ${audioLength.toFixed(3)} seconds.`,
        });
      } else if (alignToVideo) {
        console.log({
          message: `Start Video Standardization: Adding ${(videoLength - audioLength).toFixed(3)} seconds of silence to audio.`,
        });
      }
    }
  }

  // 4. More Options Go Here...

  // 4. Merge the audio and video streams

  let filename = videoSrc.split("/").pop() || "";
  filename = filename.replace(".mp4", "-new-audio.mp4");
  const outputDir = `../tmp`;
  const outputPath = `${outputDir}/${filename}`;

  console.log({ message: "Start Merge" });

  const run = ffmpeg()
    .input(videoSrc)
    .input(audioSrc)
    .outputOptions("-map 0:v:0") // Use video stream from first input
    .outputOptions("-map 1:a:0"); // Use audio stream from second input

  const str: string = await new Promise((resolve) => {
    run
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => {
        console.log({ message: "Merge complete" });
        resolve(`Completed ${message}`);
      })
      .on("error", (err) => {
        console.error("Error:", err);
        resolve("");
      })
      .save(outputPath);
  });

  if (str === "") {
    console.error("Merge failed");
    return "";
  }

  return str;
}

const video: VideoFunctions = {
  compressVideo,
  splitVideo,
  mergeVideos,
  generateEmptyFrameVideoFile,
  standardizeVideo,
  formatVideosToStandard,
  addAudioSilenceToVideo,
  mergeAudioToVideoSource,
};
export default video;
