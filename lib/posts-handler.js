'use strict';

const crypto = require('crypto');
const pug = require('pug');
const Cookies = require('cookies');
const Post = require('./post');
const util = require('./handler-util');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const trackingIdKey = 'tracking_id';

function handle(req, res) {
  const cookies = new Cookies(req, res);
   const trackingId = addTrackingCookie(cookies, req.user);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'self'; script-src https://*; style-src https://*"
      });
      Post.findAll({ order: [['id', 'DESC']] }).then( posts => {
        posts.forEach((post) => {
          post.formattedCreatedAt = dayjs(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
        });
        res.end(pug.renderFile('./views/posts.pug', { posts, user: req.user }));
        get_logger(req, cookies);
      });
      break;
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const params = new URLSearchParams(body);
        const content = params.get('content');
        post_logger(content);
        Post.create({
          content,
          trackingCookie: trackingId,
          postedBy: req.user
        }).then(() => {
          handleRedirectPosts(req, res);
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function get_logger(req, cookies) {
  console.info(
    `閲覧されました: user: ${req.user}, ` +
    `trackingId: ${ trackingId },` +
    `remoteAddress: ${req.socket.remoteAddress}, ` +
    `userAgent: ${req.headers['user-agent']} `
  );
}

function post_logger(content) {
  console.info('投稿されました: ' + content);
}

function delete_logger(req) {
  console.info(
    `削除されました: user: ${req.user}, ` +
    `remoteAddress: ${req.socket.remoteAddress}, ` +
    `userAgent: ${req.headers['user-agent']} `
  );
}

/**
   * Cookieに含まれているトラッキングIDに異常がなければその値を返し、
   * 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す
   * @param {Cookies} cookies
   * @param {String} userName
   * @return {String} トラッキングID
   */
 function addTrackingCookie(cookies, userName) {
  const requestedTrackingId = cookies.get(trackingIdKey);
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
  } else {
    const originalId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    const trackingId = originalId + '_' + createValidHash(originalId, userName);
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}

function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  const splitted = trackingId.split('_');
  const originalId = splitted[0];
  const requestedHash = splitted[1];
  return createValidHash(originalId, userName) === requestedHash;
}

const secretKey = 
'f1aef1dd95e5d48f35947fab269c8623d6a3dbc44346ca802df76ee2e4dec93536a18a00bd09760ab64fa823d76e4135c911974c51dd99fe242fcacfe66ba5ca2de887b9708591756377844d880670931aa7c65fc154601867e294dc868446493974c6392cdce55dff9e750f1040529f52677e976b0c2286f7e782e47453f75ca072ca9e6444761e822fb36acf6b5854080cb3c85a36cb9223ab5fe7babdfd11841d9ddc4fcbad8930912eacaf4ba3075205fd2ef01281a07e4b03ae63f471d0d5b4f0e1f081fa6d22855794e0eeb7d26b9af355c2f04597cecc05d5d3384089402d09a2f5b61a31fcb96200813538c9ee9653deef2cd0338ee4e8e4b1578292';

function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(originalId + userName + secretKey);
  return sha1sum.digest('hex');
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const params = new URLSearchParams(body);
        const id = params.get('id');
        Post.findByPk(id).then((post) => {
          if (req.user === post.postedBy || req.user === 'admin') {
            post.destroy().then(() => {
              delete_logger(req);
              handleRedirectPosts(req, res);
            });
          }
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}


module.exports = {
  handle,
  handleDelete
};