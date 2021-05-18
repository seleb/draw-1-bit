# `draw-1-bit`

simple 1-bit 2D canvas drawing interface

```sh
npm i draw-1-bit
```

example:

```ts
import Draw1Bit from 'draw-1-bit';

const draw = new Draw1Bit({ width: 16, height: 16 });
document.body.appendChild(draw.canvas);

// set a pixel value
draw.fill(1, 2, true);

// lock a pixel
draw.lock(1, 2, true);

// retrieve a pixel value
draw.fill(1, 2);

// retrieve a locked value
draw.lock(1, 2);

// resize drawing grid
draw.resize(32, 32);

// setup listeners
draw.addEventListener('drawstart', (event) => {
	console.log('Drawing started', event.detail.x, event.detail.y);
});
draw.addEventListener('draw', (event) => {
	console.log('Pixel changed during drawing', event.detail.x, event.detail.y, event.detail.value);
});
draw.addEventListener('drawend', (event) => {
	console.log('Drawing stopped', event.detail.x, event.detail.y);
});
```
