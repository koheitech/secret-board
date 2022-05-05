'use strict';
const pug = require('pug');
const assert = require('assert');

// XSS vulnerability test for pug template
const html = pug.renderFile('./views/posts.pug', {
  posts: [
    {
      id: 1,
      content: "<script>alert('test');</script>",
      postedBy: 'guest1',
      trackingCookie: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  user: 'guest1'
});

// check if script tag is successfully escaped.
assert(html.includes("&lt;script&gt;alert('test');&lt;/script&gt;"));
console.log('Test is successfully passed.');
