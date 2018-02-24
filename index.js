const m3u8 = require('m3u8');
const request = require('request');
const url = require('url');
const debug = require('debug')('vod-to-live');

class HLSVod {
  /**
   * Create an HLS VOD instance
   * @param {string} vodManifestUri - the uri to the master manifest of the VOD
   */
  constructor(vodManifestUri) {
    this.masterManifestUri = vodManifestUri;
    this.segments = {};
    this.mediaSequences = [];
    this.SEQUENCE_DURATION = 60;
    this.targetDuration = {};
    this.previousVod = null;
    this.usageProfile = [];
    this.segmentsInitiated = {};
  }

  /**
   * Load and parse the HLS VOD
   */
  load(_injectMasterManifest, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        let mediaManifestPromises = [];
        let baseUrl;
        const m = this.masterManifestUri.match('^(.*)/.*?$');
        if (m) {
          baseUrl = m[1] + '/';
        }
        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];        
          let mediaManifestUrl = url.resolve(baseUrl, streamItem.properties.uri);
          if (streamItem.attributes.attributes['resolution']) {
            this.usageProfile.push({
              bw: streamItem.attributes.attributes['bandwidth'],
              codecs: streamItem.attributes.attributes['codecs'],
              resolution: streamItem.attributes.attributes['resolution'][0] + 'x' + streamItem.attributes.attributes['resolution'][1]
            });
            mediaManifestPromises.push(this._loadMediaManifest(mediaManifestUrl, streamItem.attributes.attributes['bandwidth'], _injectMediaManifest));
          }
        }
        Promise.all(mediaManifestPromises)
        .then(this._createMediaSequences.bind(this))
        .then(resolve)
        .catch(reject);
      });

      parser.on('error', err => {
        reject(err);
      });

      if (!_injectMasterManifest) {
        request.get(this.masterManifestUri)
        .on('error', err => {
          reject(err);
        })
        .pipe(parser);
      } else {
        _injectMasterManifest().pipe(parser);
      }
    });
  }

  /**
   * Load and parse the HLS VOD where the first media sequences
   * contains the end sequences of the previous VOD
   * 
   * @param {HLSVod} previousVod - the previous VOD to concatenate to
   */
  loadAfter(previousVod, _injectMasterManifest, _injectMediaManifest) {
    this.previousVod = previousVod;
    this._loadPrevious();
    return this.load(_injectMasterManifest, _injectMediaManifest);
  }

  /**
   * Get all segments (duration, uri) for a specific media sequence
   * 
   * @param {number} seqIdx - media sequence index (first is 0)
   */
  getLiveMediaSequenceSegments(seqIdx) {
    return this.mediaSequences[seqIdx].segments;
  }

  /**
   * Get the available bandwidths for this VOD
   */
  getBandwidths() {
    return Object.keys(this.segments);
  }

  /**
   * Get the number of media sequences for this VOD
   */
  getLiveMediaSequencesCount() {
    return this.mediaSequences.length;
  }

  /**
   * Get the HLS live media sequence for a specific media sequence and bandwidth
   * 
   * @param {number} offset - add this offset to all media sequences in the EXT-X-MEDIA-SEQUENCE tag
   * @param {string} bandwidth
   * @param {number} seqIdx 
   */
  getLiveMediaSequences(offset, bandwidth, seqIdx) {
    const bw = this._getNearestBandwidthWithInitiatedSegments(bandwidth);
    debug(`Get live media sequence [${seqIdx}] for bw=${bw} (requested bw ${bandwidth})`);
    let m3u8 = "#EXTM3U\n";
    m3u8 += "#EXT-X-VERSION:3\n";
    m3u8 += "#EXT-X-TARGETDURATION:" + this.targetDuration[bw] + "\n";
    m3u8 += "#EXT-X-MEDIA-SEQUENCE:" + (offset + seqIdx) + "\n";
    if (!this.mediaSequences[seqIdx]) {
      debug('No segments in media sequence!');
      debug(this.mediaSequences[seqIdx]);
      debug(this.segments[bw]);
    }
    for (let i = 0; i < this.mediaSequences[seqIdx].segments[bw].length; i++) {
      const v = this.mediaSequences[seqIdx].segments[bw][i];
      if (v) {
        if (v[0] !== -1) {
          m3u8 += "#EXTINF:" + v[0] + "\n";
          m3u8 += v[1] + "\n";
        } else {
          m3u8 += "#EXT-X-DISCONTINUITY\n";
        }
      }
    }

    return m3u8;
  }

  getUsageProfiles() {
    return this.usageProfile;
  }

  _loadPrevious() {
    const previousVodSeqCount = this.previousVod.getLiveMediaSequencesCount();
    const bandwidths = this.previousVod.getBandwidths();
    for (let i = 0; i < bandwidths.length; i++) {
      const bw = bandwidths[i];
      const lastMediaSequence = this.previousVod.getLiveMediaSequenceSegments(previousVodSeqCount - 1)[bw];
      if (!this.segments[bw]) {
        this.segments[bw] = [];
      }
      for(let idx = 1; idx < lastMediaSequence.length; idx++) {
        this.segments[bw].push(lastMediaSequence[idx]);
      }
      this.segments[bw].push([-1, '']);
    }
  }

  _createMediaSequences() {
    return new Promise((resolve, reject) => {
      let segOffset = 0;
      let segIdx = 0;
      let duration = 0;
      const bw = this._getFirstBwWithSegments()
      let sequence = {};
      while (segIdx != this.segments[bw].length) {
        if (this.segments[bw][segIdx][0] !== -1) {
          duration += this.segments[bw][segIdx][0];
        }
        if (duration < this.SEQUENCE_DURATION) {
          const bandwidths = Object.keys(this.segments);
          for (let i = 0; i < bandwidths.length; i++) {
            const bwIdx = bandwidths[i];
            const v = {};
            if (!sequence[bwIdx]) {
              sequence[bwIdx] = [];
            }
            sequence[bwIdx].push(this.segments[bwIdx][segIdx]);
          }
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
      if (!this.mediaSequences) {
        reject('Failed to init media sequences');
      } else {
        resolve();
      }
    });
  }

  _getFirstBwWithSegments() {
    const bandwidths = Object.keys(this.segments).filter(bw => this.segmentsInitiated[bw]);
    if (bandwidths.length > 0) {
      return bandwidths[0];
    } else {
      console.log('ERROR: could not find any bw with segments');
      return null;
    }
  }

  _loadMediaManifest(mediaManifestUri, bandwidth, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();
      let bw = bandwidth;
      debug(`Loading media manifest for bandwidth=${bw}`);

      if (this.previousVod) {
        debug(`We have a previous VOD and need to match ${bw} with ${Object.keys(this.segments)}`);
        bw = this._getNearestBandwidth(bw);
        debug(`Selected ${bw} to use`);
      } else {
        if (!this.segments[bw]) {
          this.segments[bw] = [];
        } 
      }
  
      parser.on('m3u', m3u => {
        if (!this.segmentsInitiated[bw]) {
          for (let i = 0; i < m3u.items.PlaylistItem.length; i++) {
            const playlistItem = m3u.items.PlaylistItem[i];
            let segmentUri;
            let baseUrl;

            const m = mediaManifestUri.match('^(.*)/.*?$');
            if (m) {
              baseUrl = m[1] + '/';
            }
            
            if (playlistItem.properties.uri.match('^http')) {
              segmentUri = playlistItem.properties.uri;
            } else {
              segmentUri = url.resolve(baseUrl, playlistItem.properties.uri);
            }
            this.segments[bw].push([
              playlistItem.properties.duration,
              segmentUri
            ]);
          }
          this.targetDuration[bw] = Math.ceil(this.segments[bw].map(el => el ? el[0] : 0).reduce((max, cur) => Math.max(max, cur), -Infinity));
          this.segmentsInitiated[bw] = true;
        } else {
          debug(`Segments for ${bw} already initiated, skipping`);
        }
        resolve();
      });

      if (!_injectMediaManifest) {
        request.get(mediaManifestUri)
        .pipe(parser);
      } else {
        _injectMediaManifest(bandwidth).pipe(parser);
      }
    });
  }

  _getNearestBandwidth(bandwidth) {
    const filteredBandwidths = Object.keys(this.segments).filter(bw => this.segments[bw].length > 0);
    const availableBandwidths = filteredBandwidths.sort((a,b) => a - b);

    debug(`Find ${bandwidth} in ${availableBandwidths}`);
    for (let i = 0; i < availableBandwidths.length; i++) {
      if (bandwidth <= availableBandwidths[i]) {
        return availableBandwidths[i];
      }
    }
    return availableBandwidths[availableBandwidths.length - 1];
  }

  _getNearestBandwidthWithInitiatedSegments(bandwidth) {
    const filteredBandwidths = Object.keys(this.segments).filter(bw => this.segmentsInitiated[bw]);
    const availableBandwidths = filteredBandwidths.sort((a,b) => a - b);

    debug(`Find ${bandwidth} in ${availableBandwidths}`);
    for (let i = 0; i < availableBandwidths.length; i++) {
      if (bandwidth <= availableBandwidths[i]) {
        return availableBandwidths[i];
      }
    }
    return availableBandwidths[availableBandwidths.length - 1];    
  }

}

module.exports = HLSVod;

