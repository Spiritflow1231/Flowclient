import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const size = 256;
const rgba = Buffer.alloc(size * size * 4);

function hex(value) {
  return [1, 3, 5].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function rect(x, y, width, height, color) {
  const [red, green, blue] = hex(color);
  for (let row = Math.max(0, y); row < Math.min(size, y + height); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(size, x + width); column += 1) {
      const index = (row * size + column) * 4;
      rgba[index] = red;
      rgba[index + 1] = green;
      rgba[index + 2] = blue;
      rgba[index + 3] = 255;
    }
  }
}

rect(0, 0, size, size, '#141914');
rect(17, 17, size - 34, 2, '#323a30');
rect(17, size - 19, size - 34, 2, '#323a30');
rect(17, 17, 2, size - 34, '#323a30');
rect(size - 19, 17, 2, size - 34, '#323a30');

const tiles = [
  { x: 62, y: 62, color: '#c9f36a', shade: '#86a548' },
  { x: 134, y: 62, color: '#8caa5a', shade: '#5e7540' },
  { x: 62, y: 134, color: '#a7c86d', shade: '#758d49' },
  { x: 134, y: 134, color: '#df936f', shade: '#a76953' },
];

for (const tile of tiles) {
  rect(tile.x, tile.y, 60, 60, tile.color);
  rect(tile.x, tile.y + 52, 60, 8, tile.shade);
  rect(tile.x + 5, tile.y + 5, 50, 3, '#ffffff38');
}

const dibHeaderSize = 40;
const pixelBytes = size * size * 4;
const maskStride = Math.ceil(size / 32) * 4;
const maskBytes = maskStride * size;
const imageBytes = dibHeaderSize + pixelBytes + maskBytes;
const icon = Buffer.alloc(22 + imageBytes);
icon.writeUInt16LE(0, 0);
icon.writeUInt16LE(1, 2);
icon.writeUInt16LE(1, 4);
icon.writeUInt8(0, 6);
icon.writeUInt8(0, 7);
icon.writeUInt8(0, 8);
icon.writeUInt8(0, 9);
icon.writeUInt16LE(1, 10);
icon.writeUInt16LE(32, 12);
icon.writeUInt32LE(imageBytes, 14);
icon.writeUInt32LE(22, 18);

const dib = 22;
icon.writeUInt32LE(dibHeaderSize, dib);
icon.writeInt32LE(size, dib + 4);
icon.writeInt32LE(size * 2, dib + 8);
icon.writeUInt16LE(1, dib + 12);
icon.writeUInt16LE(32, dib + 14);
icon.writeUInt32LE(0, dib + 16);
icon.writeUInt32LE(pixelBytes + maskBytes, dib + 20);

for (let row = 0; row < size; row += 1) {
  for (let column = 0; column < size; column += 1) {
    const source = (row * size + column) * 4;
    const target = dib + dibHeaderSize + ((size - row - 1) * size + column) * 4;
    icon[target] = rgba[source + 2];
    icon[target + 1] = rgba[source + 1];
    icon[target + 2] = rgba[source];
    icon[target + 3] = rgba[source + 3];
  }
}

const resources = path.join(root, 'build');
mkdirSync(resources, { recursive: true });
writeFileSync(path.join(resources, 'icon.ico'), icon);