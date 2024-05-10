/*/
 * GET METADATA
/*/

import * as dotenv from "dotenv";
import { rename } from "node:fs";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import {
  MetadataFunctions,
  MetadataStreams,
  VideoResolution,
} from "../interfaces/metadata.interface";
dotenv.config();

// ************* GET METADATA ************* //

async function getFileMetadata(src: string): Promise<MetadataStreams> {
  const metadata: FfprobeData = await new Promise((resolve) => {
    return ffmpeg(src).ffprobe((err: any, data: FfprobeData) => resolve(data));
  });

  let videoStream: FfprobeStream | null = null;
  let audioStream: FfprobeStream | null = null;
  const stream1: FfprobeStream | null = metadata?.streams[0];
  const stream2: FfprobeStream | null = metadata?.streams[1];

  // Set Video Steam
  if (stream1?.codec_type === "video") videoStream = stream1;
  else if (stream2?.codec_type === "video") videoStream = stream2;

  // Set Audio Stream
  if (stream1?.codec_type === "audio") audioStream = stream1;
  else if (stream2?.codec_type === "audio") audioStream = stream2;

  const payload = { videoStream, audioStream };
  return payload;
}

async function returnVideoResolution(file: string): Promise<VideoResolution> {
  const fileMeta: MetadataStreams = await metadata.getFileMetadata(file);
  const fileVideo = fileMeta?.videoStream;
  const videoHeight = fileVideo?.height;
  const videoWidth = fileVideo?.width;
  const orientation =
    videoHeight && videoWidth && videoHeight > videoWidth
      ? "portrait"
      : "landscape";

  const payload: VideoResolution = {
    src: file,
    height: videoHeight || 0,
    width: videoWidth || 0,
    orientation,
    resolution: `${videoWidth}x${videoHeight}`,
  };

  return payload;
}

async function renameFile(path: string, newName: string): Promise<string> {
  return await new Promise((resolve) => {
    const filename: string = path.split("/").pop() || "";
    const newPath = path.replace(filename, newName);

    rename(path, newPath, (err) => {
      if (err) {
        console.log({ response: "ERROR: " + err });
        resolve("");
      } else resolve(newPath);
    });
  });
}

const metadata: MetadataFunctions = {
  getFileMetadata,
  returnVideoResolution,
  renameFile,
};
export default metadata;
