import ffmpeg from "fluent-ffmpeg";
import utils from "../utils/utils";

import {
  VideoCombinePayload,
  VideoUtilityFunctions,
} from "../interfaces/utils.interface";
import { VideoResolution } from "../interfaces/metadata.interface";
import { CombineVideoItem } from "../interfaces/video.interface";
import metadata from "../src/metadata";

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

    const horizontalblur = `${pboxblur}:${lumapower}:${chromaradius}:${hchromapower}`;
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

    console.log({ message: "Set Standardization FFMPEG Options", options });

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
    const { index, showBlur } = x;

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

      outputVideos.push({ index, video: tmpFilePath, showBlur });
      const output = `Video ${index} filepath updated: ${tmpFilePath}`;
      console.log({ message: output });
    } else {
      outputVideos.push({ index, video, showBlur });
    }
  }

  return outputVideos;
}

async function combineVideos(values: VideoCombinePayload): Promise<string> {
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
  videoSrc: string
): Promise<string> {
  const message = "Merging Audio and Video Source";
  console.log({ message: `Start ${message}`, audioSrc, videoSrc });

  // 1. Confirm Audio File is Audio

  const audioStreams = await metadata.getFileMetadata(audioSrc);
  if (!audioStreams?.audioStream) {
    const errMsg = "Error: Audio file does not have an audio stream";
    console.error({ status: 400, message: errMsg });
    return "";
  }
  if (audioStreams?.videoStream) {
    const errMsg = "Error: Audio file has a video stream";
    console.error({ status: 400, message: errMsg });
    return "";
  }

  // 2. Confirm Video File is Video

  const videoStreams = await metadata.getFileMetadata(videoSrc);
  if (!videoStreams?.videoStream) {
    const errMsg = "Error: Video file does not have a video stream";
    console.error({ status: 400, message: errMsg });
    return "";
  }

  // 3. Check if audio is longer than video
  //    If so, fill the video with black frames
  //    If not, fill the audio with silence

  const audioDuration = audioStreams?.audioStream?.duration || 0;
  const videoDuration = videoStreams?.videoStream?.duration || 0;
  const audioIsLonger = audioDuration > videoDuration;
  if (audioIsLonger) {
    console.log({ message: "Audio is longer than video" });
  } else {
    console.log({ message: "Video is longer than audio" });
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
  return str;
}

const VideoUtils: VideoUtilityFunctions = {
  standardizeVideo,
  formatVideosToStandard,
  combineVideos,
  addAudioSilenceToVideo,
  mergeAudioToVideoSource,
};

export default VideoUtils;
