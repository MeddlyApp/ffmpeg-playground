/*/
 * COMPRESS VIDEO
 * SPLIT VIDEO
 * TRIM VIDEO
 * COMBINE VIDEO
 * UTILITIES
/*/

import ffmpeg, { FfprobeStream } from "fluent-ffmpeg";
import utils from "../utils/utils";
import {
  CombineVideoItem,
  SplitVideo,
  VideoFunctions,
  VideoCombinePayload,
} from "../interfaces/video.interface";
import metadata from "./metadata";
import {
  MetadataStreams,
  VideoResolution,
} from "../interfaces/metadata.interface";

// ************* COMPRESS VIDEO ************* //

async function compressVideo(src: string): Promise<void> {
  console.log({ response: "Start Compressing MP4" });
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
    console.error({ response: "Error compressing video." });
    return;
  }

  console.log({ response: "End Compressing MP4" });
  return;
}

// ************* TRIM VIDEO ************* //

async function trimVideoAndAudioToSame(src: string): Promise<void> {
  const meta: MetadataStreams = await metadata.getFileMetadata(src);

  const videoStream: FfprobeStream | null = meta?.videoStream;
  const audioStream: FfprobeStream | null = meta?.audioStream;

  if (!videoStream) {
    console.error({ status: 404, response: "Error: No video stream found." });
    return;
  }
  if (!audioStream) {
    console.error({ status: 404, response: "Error: No audio stream found." });
    return;
  }

  const videoStartTime: number = videoStream.start_time || 0;
  const audioStartTime: number = audioStream.start_time || 0;

  const videoDuration: string = videoStream.duration || "0";
  const audioDuration: string = audioStream?.duration || "0";

  let newStartTime: number = 0;
  let audioTrimStart: number = 0;
  let audioTrimEnd: number = parseFloat(audioDuration);
  let videoTrimStart: number = 0;
  let videoTrimEnd: number = parseFloat(videoDuration);

  const msOffset = 20; // less than 20ms is not noticeable by humans
  const standardDeviation = msOffset / 1000;
  const audioIsOffset = audioStartTime && audioStartTime > standardDeviation;
  const videoIsOffset = videoStartTime && videoStartTime > standardDeviation;
  const noOffset = !audioIsOffset && !videoIsOffset;

  if (noOffset) {
    console.log({ response: "No offset detected." });
  }

  if (videoIsOffset) {
    console.log({ response: `Video offset: video start at ${videoStartTime}` });
  }

  // Trim video stream so both audio and video streams start_time is zero

  if (audioIsOffset) {
    console.log({
      response: `Audio offset: audio starts ${audioStartTime} seconds after video`,
    });

    videoTrimStart = audioStartTime - 0.01;
    videoTrimEnd = videoTrimEnd - audioStartTime - 0.01;

    newStartTime = audioStartTime - standardDeviation / 4;
  }

  const outputFilePath: string = `../tmp/trimmed-video.mp4`;

  const response: string = await new Promise((resolve) => {
    ffmpeg(src)
      .setStartTime(newStartTime)
      .duration(videoTrimEnd)
      // .outputOptions("-vsync 2")
      .audioFilters(`atrim=0:${videoDuration}`)
      .outputOptions("-vsync 2")
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => {
        console.log({ response: "Processing finished successfully" });
        resolve(outputFilePath);
      })
      .on("error", (err) => {
        console.error({
          response: "Error during processing: " + JSON.stringify(err),
        });
        resolve("");
      })
      .save(outputFilePath);
  });

  const hasError = response === "";
  if (hasError) {
    console.error({ response: "Error trimming video." });
    return;
  }

  return;
}

// ************* SPLIT VIDEO ************* //

async function splitVideo(vals: SplitVideo): Promise<string> {
  const { sequenceIndex, spliceStart, playDuration, src } = vals;
  console.log({ response: `Start Splitting Index: ${sequenceIndex}` });

  const filename = src.split("/").pop() || "";
  const splitname: string[] = filename.split(".");
  const name: string = splitname[0];

  const outputfile1: string = `${name}-${sequenceIndex}-part.mp4`;
  const endFilePath: string = `../tmp/${outputfile1}`;

  // Split the end of the video first
  const response: string = await new Promise((resolve) => {
    const command = ffmpeg(src);

    if (spliceStart) command.setStartTime(spliceStart);
    if (playDuration) command.setDuration(playDuration);

    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .on("progress", ({ percent }) => {
        const p: number = parseInt(percent.toFixed(0));
        utils.logProgress(p);
      })

      .on("end", () => {
        resolve(endFilePath);
      })
      .on("error", (e, stdout, stderr) => {
        utils.logError(e);
        resolve("");
      })
      .save(endFilePath);
  });

  const hasError = response === "";
  if (hasError) {
    console.error("Error splitting video.");
  }

  const completeMsg = `Saved Index ${sequenceIndex} Section: ${response}`;
  console.log({ response: completeMsg });
  return response;
}

// ************* COMBINE VIDEO ************* //

async function mergeVideos(values: VideoCombinePayload): Promise<string> {
  const { videos, endFilePath, tmpDir } = values;

  const command = ffmpeg();
  videos.forEach((x: CombineVideoItem) => command.input(x.src));

  const response = await new Promise((resolve) => {
    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .on("progress", ({ percent }) => {
        const pval = percent / videos.length;
        const p: number = parseInt(pval.toFixed(0));
        utils.logProgress(p);
      })
      .on("end", (e, stdout, stderr) => {
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

  console.log({ response: `End Combining ${videos.length} MP4's` });
  return endFilePath;
}

// ************* UTILITIES ************* //

async function generateEmptyFrameVideoFile(duration: number): Promise<string> {
  const message = `Generating Empty Frame Video File for ${duration} seconds.`;
  console.log({ response: `Start ${message}` });
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
    console.error({ response: "Error generating empty frame video file." });
    return "";
  }

  console.log({ response: `Completed ${message}` });
  return response;
}

async function standardizeVideo(
  values: VideoResolution,
  blurEdges: boolean,
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
    const portraitBackground = blurEdges ? portraitblur : portraitblack;

    // const horizontalblur = `${pboxblur}:${lumapower}:${chromaradius}:${hchromapower}`;
    const horizontalblack = `pad=${finalWidth}:${finalHeight}:(ow-iw)/2:(oh-ih)/2:black`;
    const horizontalBackground = horizontalblack; // blurEdges ? horizontalblur : horizontalblack;

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
      : blurEdges
        ? "" // `${overlay},${crop}` // BUG! show blur + landscape to horizontal
        : "";
    const options = `${standard};${overlayCrop}`;

    console.log({
      response: "Set Standardization FFMPEG Options",
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
    let { src } = x;
    const {
      sequenceIndex,
      blurEdges,
      spliceStart,
      playDuration,
      postId,
      type,
      queueEffects,
      duration,
      orientation,
      tmpSrc,
    } = x;

    let videoData = await metadata.returnVideoResolution(src);
    const { resolution } = videoData;

    const videoIsOutputResolution = resolution === outputResolution;
    const videoStreams = await metadata.getFileMetadata(src);
    const videoHasAudioStream = videoStreams?.audioStream ? true : false;

    if (!videoHasAudioStream) {
      const warn = `Video does not have an audio stream. Add blank audio ${sequenceIndex}`;
      console.warn({ response: warn });

      src = await addAudioSilenceToVideo(src);
      videoData = await metadata.returnVideoResolution(src);
    }

    if (!videoIsOutputResolution) {
      const warn = `Video is not the same resolution. Updating ${sequenceIndex}`;
      console.warn({ response: warn });

      const videoName = src.split("/").pop() || "";
      const videoExt = videoName.split(".").pop() || "";
      const filename = videoName.replace(`.${videoExt}`, "");
      const tmpFilePath: string = `../tmp/${filename}-formatted.mp4`;

      await standardizeVideo(
        videoData,
        blurEdges,
        tmpFilePath,
        outputResolution
      );

      outputVideos.push({
        sequenceIndex,
        src: tmpFilePath,
        blurEdges,
        spliceStart,
        playDuration,
        postId,
        queueEffects,
        type,
        duration,
        orientation,
        tmpSrc,
      });
      const output = `Video ${sequenceIndex} filepath updated: ${tmpFilePath}`;
      console.log({ response: output });
    } else {
      outputVideos.push({
        sequenceIndex,
        src,
        blurEdges,
        spliceStart,
        playDuration,
        postId,
        queueEffects,
        type,
        duration,
        orientation,
        tmpSrc,
      });
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

  console.log({ response: `Duration of video is ${duration}` });
  console.log({ response: `Started ${message}` });

  const response: string = await new Promise((resolve) => {
    ffmpeg(video)
      .input("anullsrc")
      .inputFormat("lavfi")
      .duration(duration)
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => {
        console.log({ response: `Completed ${message}` });
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
    console.log({ response: "Success: Video has an audio stream" });
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
    response: `Start ${message}`,
    body: { audioSrc, videoSrc, standardization: standard },
  });

  const alignToAudio = standard === "Audio";
  const alignToVideo = standard === "Video";

  // 1. Confirm Audio File is Audio

  const srcAudioStreams = await metadata.getFileMetadata(audioSrc);
  if (!srcAudioStreams?.audioStream) {
    const errMsg = "Error: Audio file does not have an audio stream";
    console.error({ status: 400, response: errMsg });
    return "";
  }
  if (srcAudioStreams?.videoStream) {
    const errMsg = "Error: Audio file has a video stream";
    console.error({ status: 400, response: errMsg });
    return "";
  }

  // 2. Confirm Video File is Video

  const srcVideoStreams = await metadata.getFileMetadata(videoSrc);
  if (!srcVideoStreams?.videoStream) {
    const errMsg = "Error: Video file does not have a video stream";
    console.error({ status: 400, response: errMsg });
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
    response: `Video Duration is ${videoLength.toFixed(3)} seconds. Audio Duration is ${audioLength.toFixed(3)} seconds.`,
  });

  const audioStdDeviation = 0.5;
  const videoStdDeviation = 0.5;
  const audioIsLongerThanVideo = audioLength > videoLength;

  if (audioIsLongerThanVideo) {
    console.log({
      response: `Audio is longer than video by ${(audioLength - videoLength).toFixed(3)} seconds`,
    });
    //  // const newVideo: string = await addBlackFramesToVideo(videoSrc, audioDuration);
    //  // videoSrc = newVideo;

    const diff = audioLength - videoLength;
    if (diff < audioStdDeviation) {
      console.log({ response: "Audio: Ok" });
    } else {
      console.log({ response: "Audio is outside standard deviation" });
      if (alignToAudio) {
        console.log({
          response: `Start Audio Standardization: Adding ${(audioLength - videoLength).toFixed(3)} seconds of blank frames to video.`,
        });
      } else if (alignToVideo) {
        console.log({
          response: `Start Video Standardization: Cutting audio at ${videoLength.toFixed(3)} seconds.`,
        });
      }
    }
  } else {
    console.log({
      response: `Video is longer than audio by ${(videoLength - audioLength).toFixed(3)} seconds.`,
    });
    //  // const newAudio: string = await addSilentAudioToVideo(audioSrc, videoDuration);
    //  // audioSrc = newAudio;

    const diff = videoLength - audioLength;
    if (diff < videoStdDeviation) {
      console.log({ response: "Video: Ok" });
    } else {
      console.log({ response: "Video is outside standard deviation" });

      if (alignToAudio) {
        console.log({
          response: `Start Audio Standardization: Cutting video at  ${audioLength.toFixed(3)} seconds.`,
        });
      } else if (alignToVideo) {
        console.log({
          response: `Start Video Standardization: Adding ${(videoLength - audioLength).toFixed(3)} seconds of silence to audio.`,
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

  console.log({ response: "Start Merge" });

  const run = ffmpeg()
    .input(videoSrc)
    .input(audioSrc)
    .outputOptions("-map 0:v:0") // Use video stream from first input
    .outputOptions("-map 1:a:0"); // Use audio stream from second input

  const response: string = await new Promise((resolve) => {
    run
      .on("progress", ({ percent }) => utils.logProgress(percent))
      .on("end", () => {
        console.log({ response: `Completed ${message}` });
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Error:", err);
        resolve("");
      })
      .save(outputPath);
  });

  if (response === "") {
    console.error("Merge failed");
    return "";
  }

  return response;
}

const video: VideoFunctions = {
  compressVideo,
  trimVideoAndAudioToSame,
  splitVideo,
  mergeVideos,
  generateEmptyFrameVideoFile,
  standardizeVideo,
  formatVideosToStandard,
  addAudioSilenceToVideo,
  mergeAudioToVideoSource,
};
export default video;
