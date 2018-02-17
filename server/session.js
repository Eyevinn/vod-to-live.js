const crypto = require('crypto');
const HLSVod = require('../index.js');

const exampleVod = [
  "https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/master.m3u8",
  "https://tv4play-i.akamaihd.net/i/mp4root/2018-01-30/pid200032256(3954321_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/master.m3u8",
];

const SessionState = Object.freeze({
  VOD_INIT: 1,
  VOD_PLAYING: 2,
  VOD_NEXT_INIT: 3,
});

class Session {
  constructor(usageProfile) {
    this._usageProfile = usageProfile;
    this._sessionId = crypto.randomBytes(20).toString('hex');
    this._state = {
      mediaSeq: 0,
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
        const realBw = this._getNearestBandwidth(bw);
        const m3u8 = this.currentVod.getLiveMediaSequences(this._state.mediaSeq, realBw, this._state.vodMediaSeq);
        this._state.vodMediaSeq++;
        resolve(m3u8);
      }).catch(reject);
    });
  }

  getMasterManifest() {
    return new Promise((resolve, reject) => {
      this._tick().then(() => {
        let m3u8 = "#EXTM3U\n";
        Object.keys(this._usageProfile).forEach(bw => {
          const v = this._usageProfile[bw];
          m3u8 += '#EXT-X-STREAM-INF:BANDWIDTH=' + bw + ',RESOLUTION=' + v[0] + ',CODECS="' + v[1] + '"\n';
          m3u8 += "master" + bw + ".m3u8;session=" + this._sessionId + "\n";
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
          let newVod;
          this._getNextVod().then(hlsVod => {
            newVod = hlsVod;
            return hlsVod.loadAfter(this.currentVod);
          }).then(() => {
            this.currentVod = newVod;
            this._state.state = SessionState.VOD_PLAYING;
            this._state.vodMediaSeq = 0;
            this._state.mediaSeq += length;
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

  _getNearestBandwidth(bandwidth) {
    const availableBandwidths = this.currentVod.getBandwidths().sort((a,b) => b - a);
    for (let i = 0; i < availableBandwidths.length; i++) {
      if (bandwidth >= availableBandwidths[i]) {
        return availableBandwidths[i];
      }
    }
  }
}

module.exports = Session;