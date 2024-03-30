/*/
 * GET METADATA
/*/

import * as dotenv from "dotenv";
import ffmpeg, { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import {
  MetadataFunctions,
  MetadataStreams,
  VideoResolution,
} from "../interfaces/metadata.interface";
dotenv.config();

// ************* GET METADATA ************* //

async function getFileMetadata(src: string): Promise<MetadataStreams> {
  console.log({ message: "Start Getting File Metadata from MP4" });
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
  console.log({ message: "End Getting File Metadata from MP4" });

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

const metadata: MetadataFunctions = { getFileMetadata, returnVideoResolution };
export default metadata;
