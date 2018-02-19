Node library for the conversion of HLS VOD to HLS Live

A library that is used to slice on-demand audio and video packaged in Apple HLS streaming format
into a list of HLS live media sequences, e.g:

```
#EXTINF:9
seg1.ts
#EXTINF:9
seg2.ts
#EXTINF:9
seg3.ts
#EXTINF:4
seg4.ts
#EXT-X-ENDLIST
```

is made available as:

```
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:9
seg1.ts
#EXTINF:9
seg2.ts
#EXTINF:9
seg3.ts
```

```
#EXT-X-MEDIA-SEQUENCE:2
#EXTINF:9
seg2.ts
#EXTINF:9
seg3.ts
#EXTINF:4
seg4.ts
```

Another on-demand HLS can be concatenated 

```
#EXTINF:9
segB1.ts
#EXTINF:9
segB2.ts
#EXTINF:9
segB3.ts
#EXTINF:4
segB4.ts
#EXT-X-ENDLIST
```

to yield the following media sequences

```
#EXT-X-MEDIA-SEQUENCE:3
#EXTINF:9
seg3.ts
#EXTINF:4
seg4.ts
#EXT-X-DISCONTINUITY
#EXTINF:9
segB1.ts
```

```
#EXT-X-MEDIA-SEQUENCE:4
#EXTINF:4
seg4.ts
#EXT-X-DISCONTINUITY
#EXTINF:9
segB1.ts
#EXTINF:9
segB2.ts
```

```
#EXT-X-MEDIA-SEQUENCE:5
#EXT-X-DISCONTINUITY
#EXTINF:9
segB1.ts
#EXTINF:9
segB2.ts
#EXTINF:9
segB3.ts
```

...

On of the use cases for this library is when to "simulate" a simulcast of a TV channel based on
a sequence of on-demand content (playlist). The video player will playback the playlist as one
live HLS stream.

## Example

    $ npm install --save vod-to-live

```
const HLSVod = require('vod-to-live.js');
const vod = new HLSVod('https://example.com/vod.m3u8');
const vod2 = new HLSVod('https://example.com/vod2.m3u8');
vod.load().then(() => {
    // Get media sequence no 5 for bitrate 798000
    console.log(vod.getLiveMediaSequences(0, '798000', 5));
    return vod2.loadAfter(vod);
}).then(() => {
    console.log(vod.getLiveMediaSequences(vod.getLiveMediaSequencesCount(), '798000', 0));    
}).catch(console.error);
```

More details in the [API documentation](https://github.com/Eyevinn/vod-to-live.js/blob/master/API.md)

## Development

A proof-of-concept implementation of server providing a simulated TV channel simulcast is included 
in this package and can be executed by running the following command.

    $ npm run dev-server

To try it out point your HLS player to `http://localhost:8000/live/master.m3u8`



