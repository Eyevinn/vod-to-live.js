const restify = require('restify');
const Session = require('./server/session.js');

const DEFAULT_USAGE_PROFILE = {
  "12494856": [ "960x540", "mp4a.40.2, avc1.4d001f" ],
  "5480576": [ "640x360", "mp4a.40.2, avc1.4d001e" ],
  "3885960": [ "640x360", "mp4a.40.2, avc1.4d001e" ],
  "2050328": [ "640x360", "mp4a.40.2, avc1.4d001e" ],
  "718536": [ "428x240", "mp4a.40.2, avc1.42e015" ],
  "391792": [ "428x240", "mp4a.40.2, avc1.42e015" ],
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