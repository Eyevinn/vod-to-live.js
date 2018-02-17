const m3u8 = require('m3u8');
const request = require('request');

class HLSVod {
  constructor(vodManifestUri) {
    this.masterManifestUri = vodManifestUri;
    this.segments = {};
    this.mediaSequences = [];
    this.SEQUENCE_DURATION = 60;
    this.targetDuration = {};
    this.previousVod = null;
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

  loadAfter(previousVod) {
    this.previousVod = previousVod;
    this._loadPrevious();
    return this.load();
  }

  getLiveMediaSequenceSegments(seqIdx) {
    return this.mediaSequences[seqIdx].segments;
  }

  getBandwidths() {
    return Object.keys(this.segments);
  }

  getLiveMediaSequencesCount() {
    return this.mediaSequences.length;
  }

  getLiveMediaSequences(offset, bandwidth, seqIdx) {
    const bw = this._getNearestBandwidth(bandwidth);
    let m3u8 = "#EXTM3U\n";
    m3u8 += "#EXT-X-VERSION:3\n";
    m3u8 += "#EXT-X-TARGETDURATION:" + this.targetDuration[bw] + "\n";
    m3u8 += "#EXT-X-MEDIA-SEQUENCE:" + (offset + seqIdx) + "\n";
    this.mediaSequences[seqIdx].segments[bw].forEach(v => {
      if (v[0] !== -1) {
        m3u8 += "#EXTINF:" + v[0] + "\n";
        m3u8 += v[1] + "\n";
      } else {
        m3u8 += "#EXT-X-DISCONTINUITY\n";
      }
    });

    return m3u8;
  }

  _loadPrevious() {
    const previousVodSeqCount = this.previousVod.getLiveMediaSequencesCount();
    const bandwidths = this.previousVod.getBandwidths();
    bandwidths.forEach(bw => {
      const lastMediaSequence = this.previousVod.getLiveMediaSequenceSegments(previousVodSeqCount - 1)[bw];
      if (!this.segments[bw]) {
        this.segments[bw] = [];
      }
      for(let idx = 1; idx < lastMediaSequence.length; idx++) {
        this.segments[bw].push(lastMediaSequence[idx]);
      }
      this.segments[bw].push([-1, '']);
    });
  }

  _createMediaSequences() {
    return new Promise((resolve, reject) => {
      let segOffset = 0;
      let segIdx = 0;
      let duration = 0;
      const bw = Object.keys(this.segments)[0];
      let sequence = {};
      while (segIdx != this.segments[bw].length) {
        if (this.segments[bw][segIdx][0] !== -1) {
          duration += this.segments[bw][segIdx][0];
        }
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
      let bw = bandwidth;
      if (!this.segments[bandwidth]) {
        if (this.previousVod) {
          // Find a close bw initiated from previous vod
          bw = this._getNearestBandwidth(bandwidth);
        } else {
          this.segments[bw] = [];
        }
      }

      parser.on('m3u', m3u => {
        m3u.items.PlaylistItem.forEach(playlistItem => {
          this.segments[bw].push([
            playlistItem.properties.duration,
            playlistItem.properties.uri
          ]);
        });
        this.targetDuration[bw] = this.segments[bw].map(el => el[0]).reduce((max, cur) => Math.max(max, cur), -Infinity);
        resolve();
      });

      request.get(mediaManifestUri)
      .pipe(parser);
    });
  }

  _getNearestBandwidth(bandwidth) {
    const availableBandwidths = Object.keys(this.segments).sort((a,b) => b - a);
    for (let i = 0; i < availableBandwidths.length; i++) {
      if (bandwidth >= availableBandwidths[i]) {
        return availableBandwidths[i];
      }
    }
  }
}

module.exports = HLSVod;