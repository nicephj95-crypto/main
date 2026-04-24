import { promises as fs } from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiUrl = 'http://localhost:4002';
const ownAddressBookId = 24;
const foreignAddressBookId = 2;
const uploadPath = '/tmp/addressbook-test-image.png';
const clientDownload1 = '/tmp/addressbook-client-download-1.png';
const adminDownload2 = '/tmp/addressbook-admin-download-2.png';
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET missing');

const clientToken = jwt.sign({ userId: 5, role: 'CLIENT' }, secret, { algorithm: 'HS256', expiresIn: '1h' });
const adminToken = jwt.sign({ userId: 1, role: 'ADMIN' }, secret, { algorithm: 'HS256', expiresIn: '1h' });

const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgZ0AAAAASUVORK5CYII=';
await fs.writeFile(uploadPath, Buffer.from(pngBase64, 'base64'));

async function jsonFetch(path, token, init = {}) {
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, ok: res.ok, data, headers: Object.fromEntries(res.headers.entries()) };
}

async function uploadImage(addressBookId, token) {
  const fileBuffer = await fs.readFile(uploadPath);
  const form = new FormData();
  form.append('images', new File([fileBuffer], 'addressbook-test-image.png', { type: 'image/png' }));
  const res = await fetch(`${apiUrl}/address-book/${addressBookId}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, ok: res.ok, data, headers: Object.fromEntries(res.headers.entries()) };
}

async function downloadImage(addressBookId, imageId, token, outPath) {
  const res = await fetch(`${apiUrl}/address-book/${addressBookId}/images/${imageId}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  if (res.ok) await fs.writeFile(outPath, buf);
  return {
    status: res.status,
    ok: res.ok,
    size: buf.length,
    text: res.ok ? null : buf.toString('utf8'),
    headers: Object.fromEntries(res.headers.entries()),
  };
}

const result = {};

result.clientUpload1 = await uploadImage(ownAddressBookId, clientToken);
const firstImageId = result.clientUpload1.data?.[0]?.id;
result.clientOwnListAfterUpload1 = await jsonFetch(`/address-book/${ownAddressBookId}/images`, clientToken);
result.clientOwnDownload1 = await downloadImage(ownAddressBookId, firstImageId, clientToken, clientDownload1);
result.clientForeignList = await jsonFetch(`/address-book/${foreignAddressBookId}/images`, clientToken);
result.clientForeignDownload = await downloadImage(foreignAddressBookId, firstImageId, clientToken, '/tmp/should-not-exist.png');
result.clientForeignDelete = await jsonFetch(`/address-book/${foreignAddressBookId}/images/${firstImageId}`, clientToken, { method: 'DELETE' });
result.adminOwnListAfterUpload1 = await jsonFetch(`/address-book/${ownAddressBookId}/images`, adminToken);
result.adminOwnDownload1 = await downloadImage(ownAddressBookId, firstImageId, adminToken, '/tmp/addressbook-admin-download-1.png');
result.clientOwnDelete1 = await jsonFetch(`/address-book/${ownAddressBookId}/images/${firstImageId}`, clientToken, { method: 'DELETE' });
result.clientOwnListAfterDelete1 = await jsonFetch(`/address-book/${ownAddressBookId}/images`, clientToken);

result.clientUpload2 = await uploadImage(ownAddressBookId, clientToken);
const secondImageId = result.clientUpload2.data?.[0]?.id;
result.adminOwnListAfterUpload2 = await jsonFetch(`/address-book/${ownAddressBookId}/images`, adminToken);
result.adminOwnDownload2 = await downloadImage(ownAddressBookId, secondImageId, adminToken, adminDownload2);
result.adminOwnDelete2 = await jsonFetch(`/address-book/${ownAddressBookId}/images/${secondImageId}`, adminToken, { method: 'DELETE' });
result.clientOwnListAfterAdminDelete2 = await jsonFetch(`/address-book/${ownAddressBookId}/images`, clientToken);

console.log(JSON.stringify(result, null, 2));
