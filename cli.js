const HLSVod = require('./index.js');

const url = process.argv[2];

console.log(`Parsing ${url}`);

const hlsVod = new HLSVod(url);
let hlsVod2;
hlsVod.load().then(() => {
  console.log("VOD 1");
  console.log(`Media Sequences: ${hlsVod.getLiveMediaSequencesCount()}`);
  console.log(hlsVod.getUsageProfiles());
  hlsVod2 = new HLSVod(url);
  return hlsVod2.loadAfter(hlsVod);
}).then(() => {
  console.log("VOD 2");
  console.log(`Media Sequences: ${hlsVod2.getLiveMediaSequencesCount()}`);
  console.log(hlsVod2.getUsageProfiles());  
}).catch(console.error);