import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeImgproxySourceUrl, toImgproxyFilenameBase } from './imgproxy.js';

test('removes the final extension before passing a filename to imgproxy', () => {
  assert.equal(toImgproxyFilenameBase('proxy-verification.jpg'), 'proxy-verification');
  assert.equal(toImgproxyFilenameBase('cover.final.png'), 'cover.final');
  assert.equal(toImgproxyFilenameBase('勘冴えて悔しいわ_1.webp'), '勘冴えて悔しいわ_1');
});

test('preserves names that do not have a usable final extension', () => {
  assert.equal(toImgproxyFilenameBase('proxy-verification'), 'proxy-verification');
  assert.equal(toImgproxyFilenameBase('.hidden'), '.hidden');
  assert.equal(toImgproxyFilenameBase('filename.'), 'filename.');
});

test('encodes a complete imgproxy source URL as URL-safe base64 without padding', () => {
  const sourceUrl = 'https://images.example.test/vi/video-id/maxresdefault.jpg';
  const encoded = encodeImgproxySourceUrl(sourceUrl);

  assert.equal(Buffer.from(encoded, 'base64url').toString('utf8'), sourceUrl);
  assert.doesNotMatch(encoded, /[+/=]/);
});
