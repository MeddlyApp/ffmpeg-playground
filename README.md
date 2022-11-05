# Getting Started

1. Make sure ffmpeg is installed locally on machine
2. `npm install` or `yarn`
3. Configure .env

### ENV Example

```
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_BUCKET_NAME=""
AWS_DESTINATION_PATH=""
AWS_REGION=""
AWS_CDN_URL=""

REMOTE_FILE_URL=""
REMOTE_FILE_OUTPUT=""

LOCAL_FILE_URL=""
LOCAL_FILE_OUTPUT=""
```

# Overview

- Extract MP3 from MP4, upload to AWS S3
- Compress video
- Make GIF preview from mp4
