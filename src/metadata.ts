/*/
 * GET METADATA
/*/

import * as dotenv from "dotenv";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import {
  MetadataFunctions,
  MetadataStreams,
} from "../interfaces/metadata.interface";
dotenv.config();

// ************* GET METADATA ************* //

async function getFileMetadata(uri: string): Promise<MetadataStreams> {
  console.log({ message: "Start Getting File Metadata from MP4" });
  const metadata: FfprobeData = await new Promise((resolve) => {
    return ffmpeg(uri).ffprobe((err: any, data: FfprobeData) => resolve(data));
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

  console.log({ uri, videoStream, audioStream });
  console.log({ message: "End Getting File Metadata from MP4" });

  const payload = { videoStream, audioStream };
  return payload;
}

async function returnVideoResolution(file: string): Promise<string> {
  const fileMeta: MetadataStreams = await metadata.getFileMetadata(file);
  const fileVideo = fileMeta?.videoStream;
  const videoHeight = fileVideo?.height;
  const videoWidth = fileVideo?.width;
  const videoResolution = `${videoWidth}x${videoHeight}`;
  return videoResolution;
}

const metadata: MetadataFunctions = { getFileMetadata, returnVideoResolution };
export default metadata;
