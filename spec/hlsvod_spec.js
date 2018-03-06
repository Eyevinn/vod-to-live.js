const HLSVod = require('../index.js');
const fs = require('fs');

describe("HLSVod standalone", () => {
  let mockMasterManifest;
  let mockMediaManifest;

  beforeEach(() => {
    mockMasterManifest = function() {
      return fs.createReadStream('testvectors/hls1/master.m3u8');
    };
    mockMediaManifest = function(bandwidth) {
      return fs.createReadStream('testvectors/hls1/' + bandwidth + '.m3u8');
    };
  });

  it("returns the correct number of media sequences", done => {
    mockVod = new HLSVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      expect(mockVod.getLiveMediaSequencesCount()).toBe(289);
      done();
    });
  });

  it("returns the correct number of bandwidths", done => {
    mockVod = new HLSVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      expect(mockVod.getBandwidths().length).toBe(4);
      expect(mockVod.getBandwidths()).toEqual(['1497000', '2497000', '3496000', '4497000']);
      done();
    });
  });

  it("has the first segments in the first media sequence and that they are ABR aligned", done => {
    mockVod = new HLSVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const seqSegments = mockVod.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'].length).toBe(6);
      expect(seqSegments['2497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment1_2_av.ts");
      expect(seqSegments['1497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment1_3_av.ts");
      expect(seqSegments['2497000'][5][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment6_2_av.ts");
      expect(seqSegments['1497000'][5][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment6_3_av.ts");
      done();
    });
  });

  it("has the second media sequence not containing the first segment", done => {
    mockVod = new HLSVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const seqSegments = mockVod.getLiveMediaSequenceSegments(1);
      expect(seqSegments['2497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment2_2_av.ts");
      expect(seqSegments['1497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment2_3_av.ts");
      done();
    });
  });

  it("has the last media sequence containing the last segments and that they are ABR aligned", done => {
    mockVod = new HLSVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const lastMediaSeq = mockVod.getLiveMediaSequencesCount() - 1;
      const seqSegments = mockVod.getLiveMediaSequenceSegments(lastMediaSeq);
      expect(seqSegments['2497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment289_2_av.ts");
      expect(seqSegments['1497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment289_3_av.ts");
      expect(seqSegments['2497000'][5][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment294_2_av.ts");
      expect(seqSegments['1497000'][5][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment294_3_av.ts");
      done();
    });
  });
});

describe("HLSVod after another VOD", () => {
  let mockMasterManifest;
  let mockMediaManifest;

  beforeEach(() => {
    mockMasterManifest = function() {
      return fs.createReadStream('testvectors/hls1/master.m3u8');
    };
    mockMediaManifest = function(bandwidth) {
      return fs.createReadStream('testvectors/hls1/' + bandwidth + '.m3u8');
    };
  });

  it("has the first segments from the previous VOD", done => {
    mockVod = new HLSVod('http://mock.com/mock.m3u8');
    mockVod2 = new HLSVod('http://mock.com/mock2.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod2.loadAfter(mockVod, mockMasterManifest, mockMediaManifest);
    }).then(() => {
      const seqSegments = mockVod2.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment290_2_av.ts");
      expect(seqSegments['1497000'][0][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment290_3_av.ts");
      expect(seqSegments['2497000'][5][0]).toBe(-1); // Discontinuity
      expect(seqSegments['2497000'][6][1]).toEqual("https://tv4play-i.akamaihd.net/i/mp4root/2018-01-26/pid200032972(3953564_,T3MP445,T3MP435,T3MP425,T3MP415,T3MP48,T3MP43,T3MP4130,).mp4.csmil/segment1_2_av.ts");
      done();
    });
  });
});

describe("HLSVod with ad splicing", () => {
  let mockMasterManifest;
  let mockMediaManifest;

  beforeEach(() => {
    mockMasterManifest = function() {
      return fs.createReadStream('testvectors/hls1/master.m3u8');
    };
    mockMediaManifest = function(bandwidth) {
      return fs.createReadStream('testvectors/hls1/' + bandwidth + '.m3u8');
    };
  });

  it("has an ad splice at ~10 seconds and ~176 seconds from the start", done => {
    const splices = [
      { 
        position: 10.0,
        segments: {
          '2497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
      { 
        position: 176.5,
        segments: {
          '2497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
          '1497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
        }
      }
    ];
    let mockVod = new HLSVod('http://mock.com/mock.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      let seqSegments = mockVod.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'][1][0]).toBe(-1);
      seqSegments = mockVod.getLiveMediaSequenceSegments(18);
      expect(seqSegments['2497000'][5][0]).toBe(-1);
      expect(seqSegments['2497000'][6][0]).toBe(3);
      expect(seqSegments['2497000'][6][1]).toBe('ad11.ts');
      seqSegments = mockVod.getLiveMediaSequenceSegments(20);
      expect(seqSegments['2497000'][7][0]).toBe(-1);
      done();
    });
  });

  it("does not start with a discontinuity if ad is the first segment", done => {
    const splices = [
      { 
        position: 5.0,
        segments: {
          '2497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
    ];
    let mockVod = new HLSVod('http://mock.com/mock.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      let seqSegments = mockVod.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'][0][0]).not.toBe(-1);
      done();
    });
  });

  it("does not end with a discontinuity if ad is the last segment", done => {
    const splices = [
      { 
        position: 2646.0,
        segments: {
          '2497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
    ];
    let mockVod = new HLSVod('http://mock.com/mock.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const count = mockVod.getLiveMediaSequencesCount();
      let seqSegments = mockVod.getLiveMediaSequenceSegments(count - 1);
      const seqLength = seqSegments['2497000'].length;
      expect(seqSegments['2497000'][seqLength - 1][0]).not.toBe(-1);
      expect(seqSegments['2497000'][seqLength - 1][1]).toEqual('ad03.ts');
      done();
    });
  });

  it("has an ad splice at ~10 seconds from where the new VOD starts", done => {
    const splices = [
      { 
        position: 10.0,
        segments: {
          '2497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
      { 
        position: 176.5,
        segments: {
          '2497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
          '1497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
        }
      }
    ];
    let mockVod = new HLSVod('http://mock.com/mock.m3u8');
    let mockVod2 = new HLSVod('http://mock.com/mock2.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod2.loadAfter(mockVod, mockMasterManifest, mockMediaManifest);
    }).then(() => {
      const seqSegments = mockVod2.getLiveMediaSequenceSegments(1);
      expect(seqSegments['2497000'][4][0]).toBe(-1);
      expect(seqSegments['2497000'][6][0]).toBe(-1);
      done();
    });    
  });

  it("does not contain ad splice outside of content duration", done => {
    const splices = [
      { 
        position: 5430.5,
        segments: {
          '2497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
    ];
    let mockVod = new HLSVod('http://mock.com/mock.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const count = mockVod.getLiveMediaSequencesCount();
      let seqSegments = mockVod.getLiveMediaSequenceSegments(count - 1);
      const seqLength = seqSegments['2497000'].length;
      expect(seqSegments['2497000'][seqLength - 1][1]).not.toEqual('ad03.ts');
      done();
    });
  });

  it("can handle ad that does not match current vod usage profile", done => {
    const splices = [
      { 
        position: 10.0,
        segments: {
          '2498000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1494000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
    ];
    let mockVod = new HLSVod('http://mock.com/mock.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      let seqSegments = mockVod.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'][2][1]).toEqual('ad01.ts');
      done();
    });
  });

  it("can handle two ads back-to-back", done => {
    const splices = [
      { 
        position: 0.0,
        segments: {
          '2497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
      { 
        position: 9.0,
        segments: {
          '2497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
          '1497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
        }
      }
    ];
    let mockVod = new HLSVod('http://mock.com/mock.m3u8');
    let mockVod2 = new HLSVod('http://mock.com/mock2.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod2.loadAfter(mockVod, mockMasterManifest, mockMediaManifest);
    }).then(() => {
      const seqSegments = mockVod2.getLiveMediaSequenceSegments(1);
      expect(seqSegments['2497000'][4][0]).toBe(-1);
      expect(seqSegments['2497000'][5][0]).not.toBe(-1);
      expect(seqSegments['2497000'][7][1]).toBe('ad03.ts');
      expect(seqSegments['2497000'][8][0]).toBe(-1);
      expect(seqSegments['2497000'][9][1]).toBe('ad11.ts');
      done();
    });    
  });
});

describe("HLSVod with timeline", () => {
  let mockMasterManifest;
  let mockMediaManifest;

  beforeEach(() => {
    mockMasterManifest = function() {
      return fs.createReadStream('testvectors/hls1/master.m3u8');
    };
    mockMediaManifest = function(bandwidth) {
      return fs.createReadStream('testvectors/hls1/' + bandwidth + '.m3u8');
    };
  });

  it("can be initiated with a non-zero timeoffset", done => {
    const now = Date.now();
    let mockVod = new HLSVod('http://mock.com/mock.m3u8', [], now);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const count = mockVod.getLiveMediaSequencesCount();
      let seqSegments = mockVod.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'][0][2]).toEqual(now);
      seqSegments = mockVod.getLiveMediaSequenceSegments(1);
      expect(seqSegments['2497000'][5][2]).toEqual(now + 9*6*1000);
      seqSegments = mockVod.getLiveMediaSequenceSegments(count - 1);
      expect(seqSegments['2497000'][5][2]).toEqual(now + 2637 * 1000);
      done();
    });
  });

  it("can handle vod after another vod", done => {
    const now = Date.now();
    mockVod = new HLSVod('http://mock.com/mock.m3u8', [], now);
    mockVod2 = new HLSVod('http://mock.com/mock2.m3u8', []);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod2.loadAfter(mockVod, mockMasterManifest, mockMediaManifest);
    }).then(() => {
      const seqSegments = mockVod2.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'][4][2]).toEqual(now + 2637 * 1000);
      expect(seqSegments['2497000'][6][2]).toEqual(now + 2637*1000 +  9*1000);
      done();
    });
  });

  it("can handle vod after another vod with two ads back-to-back", done => {
    const splices = [
      { 
        position: 0.0,
        segments: {
          '2497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
          '1497000': [ [3, 'ad01.ts'], [3, 'ad02.ts'], [3, 'ad03.ts'], ],
        }
      },
      { 
        position: 9.0,
        segments: {
          '2497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
          '1497000': [ [3, 'ad11.ts'], [3, 'ad12.ts'], [3, 'ad13.ts'], ],
        }
      }
    ];
    const now = Date.now();
    mockVod = new HLSVod('http://mock.com/mock.m3u8', [], now);
    mockVod2 = new HLSVod('http://mock.com/mock2.m3u8', splices);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod2.loadAfter(mockVod, mockMasterManifest, mockMediaManifest);
    }).then(() => {
      const seqSegments = mockVod2.getLiveMediaSequenceSegments(0);
      expect(seqSegments['2497000'][4][2]).toEqual(now + 2637 * 1000);
      expect(seqSegments['2497000'][6][2]).toEqual(now + 2637*1000 + 9*1000);
      done();
    });
  });

  it("outputs EXT-X-PROGRAM-DATE-TIME after discontinuity", done => {
    const now = Date.now();
    mockVod = new HLSVod('http://mock.com/mock.m3u8', [], now);
    mockVod2 = new HLSVod('http://mock.com/mock2.m3u8', []);
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod2.loadAfter(mockVod, mockMasterManifest, mockMediaManifest);
    }).then(() => {
      let m3u8 = mockVod2.getLiveMediaSequences(0, '2497000', 0);
      let m = m3u8.match('#EXT-X-DISCONTINUITY\n#EXT-X-PROGRAM-DATE-TIME:(.*)\n');
      expect(m).toBeDefined();
      // Make sure date-time is unchanged on next media sequence
      d = m[1];
      m3u8 = mockVod2.getLiveMediaSequences(0, '2497000', 1);
      m = m3u8.match('#EXT-X-DISCONTINUITY\n#EXT-X-PROGRAM-DATE-TIME:(.*)\n');
      expect(d).toEqual(m[1]);
      done();
    });
  });
});