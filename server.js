const restify = require('restify');
const Session = require('./server/session.js');

const DEFAULT_USAGE_PROFILE = {
  "4497000": [ "1280x720", "avc1.77.30, mp4a.40.2" ],
  "3496000": [ "1280x720", "avc1.77.30, mp4a.40.2" ],
  "2497000": [ "1024x576", "avc1.77.30, mp4a.40.2" ],
  "1497000": [ "768x432", "avc1.77.30, mp4a.40.2" ],
  "798000": [ "640x360", "avc1.66.30, mp4a.40.2" ],
  "298000": [ "384x216", "avc1.66.30, mp4a.40.2" ],
  "127000": [ "128x72", "avc1.66.30, mp4a.40.2" ],
};

const server = restify.createServer();
const sessions = {};

server.get('/live/master.m3u8', (req, res, next) => {
  console.log(req.url);
  const session = new Session(DEFAULT_USAGE_PROFILE);
  sessions[session.sessionId] = session;
  session.getMasterManifest().then(body => {
    res.sendRaw(200, body, { "Content-Type": 'application/x-mpegURL'});
    next();
  }).catch(err => {
    console.error(err);
    res.send(err);
    next();
  })
});

server.get(/^\/live\/master(\d+).m3u8;session=(.*)$/, (req, res, next) => {
  console.log(req.url);
  const session = sessions[req.params[1]];
  if (session) {
    session.getMediaManifest(req.params[0]).then(body => {
      res.sendRaw(200, body, { "Content-Type": 'application/x-mpegURL'});
      next();
    }).catch(err => {
      console.error(err);
      res.send(err);
      next();
    })
  } else {
    res.send('Invalid session');
    next();
  }
});


server.listen(process.env.PORT || 8000, () => {
  console.log('%s listening at %s', server.name, server.url);
});