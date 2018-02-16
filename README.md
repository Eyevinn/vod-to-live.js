Node library for the conversion of HLS VOD to HLS Live

## Example

    $ npm install --save vod-to-live

```
const HLSVod = require('vod-to-live');
const vod = new HLSVod('https://example.com/vod.m3u8');
vod.load().then(() => {
    // Get media sequence no 5 for bitrate 798000
    console.log(vod.getLiveMediaSequences(0, '798000', 5));
})
```

## Development

    $ npm run dev-server

## API Documentation

TO BE ADDED


