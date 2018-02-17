const HLSVod = require('./index.js');

const exampleVod = "https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/master.m3u8";
const exampleVod2 = "https://tv4play-i.akamaihd.net/i/mp4root/2018-01-30/pid200032256(3954321_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/master.m3u8";

const vod = new HLSVod(exampleVod);
const vod2 = new HLSVod(exampleVod2);
let offset = 0;
vod.load().then(() => {
  const bandwidths = vod.getBandwidths();
  console.log(bandwidths);
  const length = vod.getLiveMediaSequencesCount();
  console.log(vod.getLiveMediaSequences(offset, bandwidths[1], 0));
  console.log(vod.getLiveMediaSequences(offset, bandwidths[2], 0));
  console.log(vod.getLiveMediaSequences(offset, bandwidths[1], 1));
  console.log(vod.getLiveMediaSequences(offset, bandwidths[1], length - 1));
  offset = length;
  return vod2.loadAfter(vod);
}).then(() => {
  const bandwidths = vod2.getBandwidths();
  console.log(bandwidths);
  console.log(vod2.getLiveMediaSequences(offset, bandwidths[1], 0));
  console.log(vod2.getLiveMediaSequences(offset, bandwidths[1], 1));
}).catch(console.error);
