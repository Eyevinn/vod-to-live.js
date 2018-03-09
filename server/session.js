const crypto = require('crypto');
const HLSVod = require('../index.js');

const exampleVod = [
  "https://maitv-vod.lab.eyevinn.technology/VINN.mp4/master.m3u8",
  "https://maitv-vod.lab.eyevinn.technology/tearsofsteel_4k.mov/master.m3u8",
  "https://maitv-vod.lab.eyevinn.technology/Attjobbapavinnter.mp4/master.m3u8",
];

const SessionState = Object.freeze({
  VOD_INIT: 1,
  VOD_PLAYING: 2,
  VOD_NEXT_INIT: 3,
});

class Session {
  constructor() {
    this._sessionId = crypto.randomBytes(20).toString('hex');
    this._state = {
      mediaSeq: 0,
      discSeq: 0,
      vodMediaSeq: 0,
      state: SessionState.VOD_INIT,
    };
    this.currentVod;
  }

  get sessionId() {
    return this._sessionId;
  }

  getMediaManifest(bw) {
    return new Promise((resolve, reject) => {
      this._tick().then(() => {
        const m3u8 = this.currentVod.getLiveMediaSequences(this._state.mediaSeq, bw, this._state.vodMediaSeq, this._state.discSeq);
        this._state.vodMediaSeq++;
        resolve(m3u8);
      }).catch(reject);
    });
  }

  getMasterManifest() {
    return new Promise((resolve, reject) => {
      this._tick().then(() => {
        let m3u8 = "#EXTM3U\n";
        this.currentVod.getUsageProfiles().forEach(profile => {
          m3u8 += '#EXT-X-STREAM-INF:BANDWIDTH=' + profile.bw + ',RESOLUTION=' + profile.resolution + ',CODECS="' + profile.codecs + '"\n';
          m3u8 += "master" + profile.bw + ".m3u8;session=" + this._sessionId + "\n";
        });
        resolve(m3u8);
      }).catch(reject);
    });
  }

  _tick() {
    return new Promise((resolve, reject) => {
      // State machine
      switch(this._state.state) {
        case SessionState.VOD_INIT:
          console.log("[VOD_INIT]");
          this._getNextVod().then(hlsVod => {
            this.currentVod = hlsVod;
            return this.currentVod.load();
          }).then(() => {
            this._state.state = SessionState.VOD_PLAYING;
            //this._state.vodMediaSeq = this.currentVod.getLiveMediaSequencesCount() - 5;
            this._state.vodMediaSeq = 0;
            resolve();
          })
          break;
        case SessionState.VOD_PLAYING:
          console.log("[VOD_PLAYING]");
          if (this._state.vodMediaSeq === this.currentVod.getLiveMediaSequencesCount() - 1) {
            this._state.state = SessionState.VOD_NEXT_INIT;
          }
          resolve();
          break;
        case SessionState.VOD_NEXT_INIT:
          console.log("[VOD_NEXT_INIT]");
          const length = this.currentVod.getLiveMediaSequencesCount();
          const lastDiscontinuity = this.currentVod.getLastDiscontinuity();
          let newVod;
          this._getNextVod().then(hlsVod => {
            newVod = hlsVod;
            return hlsVod.loadAfter(this.currentVod);
          }).then(() => {
            this.currentVod = newVod;
            this._state.state = SessionState.VOD_PLAYING;
            this._state.vodMediaSeq = 0;
            this._state.mediaSeq += length;
            this._state.discSeq += lastDiscontinuity;
            resolve();
          });
          break;
        default:
          reject("Invalid state: " + this.state.state);
      }

    });
  }

  _getNextVod() {
    return new Promise((resolve, reject) => {
      const rndIdx = Math.floor(Math.random() * exampleVod.length);
      console.log(exampleVod[rndIdx]);
      const newVod = new HLSVod(exampleVod[rndIdx|0]);
      resolve(newVod);
    });
  }
}

module.exports = Session;