const m3u8 = require('m3u8');
const request = require('request');

class HLSVod {
  constructor(vodManifestUri) {
    this.masterManifestUri = vodManifestUri;
    this.segments = {};
    this.mediaSequences = [];
    this.SEQUENCE_DURATION = 60;
    this.targetDuration = {};
  }

  load() {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        let mediaManifestPromises = [];
        m3u.items.StreamItem.forEach(streamItem => {
          mediaManifestPromises.push(this._loadMediaManifest(streamItem.properties.uri, streamItem.attributes.attributes['bandwidth']));
        });
        Promise.all(mediaManifestPromises)
        .then(this._createMediaSequences.bind(this))
        .then(resolve)
        .catch(reject);
      });

      parser.on('error', err => {
        reject(err);
      });

      request.get(this.masterManifestUri)
      .on('error', err => {
        reject(err);
      })
      .pipe(parser);
    });
  }

  getBandwidths() {
    return Object.keys(this.segments);
  }

  getLiveMediaSequences(offset, bandwidth, seqIdx) {
    let m3u8 = "#EXTM3U\n";
    m3u8 += "#EXT-X-VERSION:3\n";
    m3u8 += "#EXT-X-TARGETDURATION:" + this.targetDuration[bandwidth] + "\n";
    m3u8 += "#EXT-X-MEDIA-SEQUENCE:" + (offset + seqIdx) + "\n";
    //m3u8 += "#EXT-X-PLAYLIST-TYPE:EVENT\n";
    this.mediaSequences[seqIdx].segments[bandwidth].forEach(v => {
      m3u8 += "#EXTINF:" + v[0] + "\n";
      m3u8 += v[1] + "\n";
    });

    return m3u8;
  }

  _createMediaSequences() {
    return new Promise((resolve, reject) => {
      let segOffset = 0;
      let segIdx = 0;
      let duration = 0;
      const bw = Object.keys(this.segments)[0];
      let sequence = {};
      while (segIdx != this.segments[bw].length) {
        duration += this.segments[bw][segIdx][0];
        if (duration < this.SEQUENCE_DURATION) {
          Object.keys(this.segments).forEach(bwIdx => {
            const v = {};
            if (!sequence[bwIdx]) {
              sequence[bwIdx] = [];
            }
            sequence[bwIdx].push(this.segments[bwIdx][segIdx]);
          });
          segIdx++;
        } else {
          duration = 0;
          this.mediaSequences.push({
            segments: sequence,
          });
          sequence = [];
          segOffset++;
          segIdx = segOffset;
        }
      }
      resolve();
    });
  }

  _loadMediaManifest(mediaManifestUri, bandwidth) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();
      if (!this.segments[bandwidth]) {
        this.segments[bandwidth] = [];
      }

      parser.on('m3u', m3u => {
        m3u.items.PlaylistItem.forEach(playlistItem => {
          this.segments[bandwidth].push([
            playlistItem.properties.duration,
            playlistItem.properties.uri
          ]);
        });
        this.targetDuration[bandwidth] = this.segments[bandwidth].map(el => el[0]).reduce((max, cur) => Math.max(max, cur), -Infinity);
        resolve();
      });

      request.get(mediaManifestUri)
      .pipe(parser);
    });
  }
}

module.exports = HLSVod;