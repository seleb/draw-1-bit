import bresenham from 'bresenham';

function k(x: number, y: number) {
	return [x, y].join(',');
}

export default class Draw1Bit {
	public canvas: HTMLCanvasElement;
	public context: CanvasRenderingContext2D;
	private width: number;
	private height: number;
	private x = -1;
	private y = -1;
	private px = -1;
	private py = -1;
	private pfilling: boolean | undefined;
	private filling: boolean | undefined;
	private hovered = false;
	public gridSize: number;
	public gridLimit: number;
	public colorBg: string;
	public colorFill: string;
	public colorGrid: string;
	public colorHover: string;
	public filled: Record<string, boolean | undefined>;
	public locked: Record<string, boolean | undefined>;
	constructor({
		width,
		height,
		gridSize = 1,
		gridLimit = 16,
		colorBg = '#000',
		colorFill = '#FFF',
		colorGrid = '#333',
		colorHover = '#333',
		filled = {},
		locked = {},
	}: {
		/** width of canvas in pixels */
		width: number;
		/** height of canvas in pixels */
		height: number;
		/** size of grid-lines in pixels
		 * @default 1 */
		gridSize?: number;
		/** minimum pixel size required to draw grid-lines
		 * @default 16 */
		gridLimit?: number;
		/** color of background
		 * @default '#000' */
		colorBg?: string;
		/** color of filled pixels
		 * @default '#FFF' */
		colorFill?: string;
		/** color of grid lines (applied as a difference)
		 * @default '#333' */
		colorGrid?: string;
		/** color of hovered pixel (applied as a difference)
		 * @default '#333' */
		colorHover?: string;
		/** map of initially filled pixels */
		filled?: Record<string, boolean | undefined>;
		/** map of initially locked pixels */
		locked?: Record<string, boolean | undefined>;
	}) {
		this.canvas = document.createElement('canvas');
		this.canvas.style.imageRendering = 'pixelated';
		this.canvas.addEventListener('mousemove', this.onCanvasMove);
		this.canvas.addEventListener('mousedown', this.onDown);
		this.canvas.addEventListener('mouseout', this.onMouseOut);

		try {
			new ResizeObserver(() => {
				this.resizeCanvas();
			}).observe(this.canvas);
		} catch {
			console.warn('ResizeObserver not supported: draw-1-bit will not automatically render on resize');
		}

		const context = this.canvas.getContext('2d');
		if (!context) throw new Error("Couldn't create 2D canvas context");
		this.context = context;
		this.context.imageSmoothingEnabled = false;

		this.width = width;
		this.height = height;
		this.gridSize = gridSize;
		this.gridLimit = gridLimit;
		this.colorBg = colorBg;
		this.colorFill = colorFill;
		this.colorGrid = colorGrid;
		this.colorHover = colorHover;

		this.filled = filled;
		this.locked = locked;
		this.render();
	}

	private resizeCanvas() {
		const sw = this.canvas.clientWidth;
		const sh = this.canvas.clientHeight;
		this.canvas.width = sw * window.devicePixelRatio;
		this.canvas.height = sh * window.devicePixelRatio;
		this.render();
	}

	private onCanvasMove = (event: MouseEvent) => {
		this.move(event);
	};

	private onWindowMove = (event: MouseEvent) => {
		this.move(event);
	};

	private getPos(event: MouseEvent) {
		const rect = this.canvas.getBoundingClientRect();

		const rx = this.canvas.width / this.width;
		const ry = this.canvas.height / this.height;
		const r = Math.min(rx, ry);

		let x = (event.clientX - rect.left) / rect.width;
		let y = (event.clientY - rect.top) / rect.height;
		x -= 0.5;
		y -= 0.5;
		x *= rx / r;
		y *= ry / r;
		x += 0.5;
		y += 0.5;
		x *= this.width;
		y *= this.height;
		x = Math.floor(x);
		y = Math.floor(y);
		return [x, y];
	}

	private move(event: MouseEvent) {
		const [nx, ny] = this.getPos(event);
		this.x = nx;
		this.y = ny;
		const phovered = this.hovered;
		this.hovered = nx >= 0 && ny >= 0 && nx < this.width && ny < this.height;
		if (nx === this.px && ny === this.py && this.filling === this.pfilling) {
			if (phovered !== this.hovered) this.render();
			return;
		}

		if (this.filling !== undefined) {
			bresenham(nx, ny, this.px, this.py, (x, y) => {
				if (x >= 0 && y >= 0 && x < this.width && y < this.height && !this.locked[k(x, y)]) {
					if (this.filled[k(x, y)] !== this.filling) {
						this.filled[k(x, y)] = this.filling;
						this.canvas.dispatchEvent(new CustomEvent('draw', { detail: { x, y, value: this.filling } }));
					}
				}
			});
		}

		this.px = nx;
		this.py = ny;
		this.pfilling = this.filling;
		this.render();
	}

	private onDown = (event: MouseEvent) => {
		if (event.button !== 0 || this.locked[k(this.x, this.y)]) return;
		this.canvas.removeEventListener('mousemove', this.onCanvasMove);
		this.canvas.removeEventListener('mouseout', this.onMouseOut);
		window.addEventListener('mousemove', this.onWindowMove);
		window.addEventListener('mouseup', this.onUp);
		const value = !this.filled[k(this.x, this.y)];
		this.filling = value;
		this.canvas.dispatchEvent(new CustomEvent('drawstart', { detail: { x: this.x, y: this.y } }));
		this.move(event);
	};

	private onMouseOut = () => {
		this.hovered = false;
		this.render();
	};

	private onUp = () => {
		this.filling = undefined;
		window.removeEventListener('mousemove', this.onWindowMove);
		window.removeEventListener('mouseup', this.onUp);
		this.canvas.addEventListener('mousemove', this.onCanvasMove);
		this.canvas.addEventListener('mouseout', this.onMouseOut);
		this.canvas.dispatchEvent(new CustomEvent('drawend', { detail: { x: this.x, y: this.y } }));
	};

	/** updates canvas */
	render() {
		this.context.save();
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		const rx = this.canvas.width / this.width;
		const ry = this.canvas.height / this.height;
		const r = Math.min(rx, ry);
		this.context.translate((this.canvas.width - this.width * r) / 2, (this.canvas.height - this.height * r) / 2);
		this.context.fillStyle = this.colorBg;
		this.context.fillRect(0, 0, this.width * r, this.height * r);
		this.context.fillStyle = this.colorFill;
		// fill
		for (let y = 0; y < this.height; ++y) {
			for (let x = 0; x < this.width; ++x) {
				if (this.locked[k(x, y)]) {
					this.context.globalAlpha = 0.5;
					this.context.fillRect(Math.floor(x * r), Math.floor(y * r), Math.ceil(1 * r), Math.ceil(1 * r));
					this.context.globalAlpha = 1.0;
				} else if (this.filled[k(x, y)]) {
					this.context.fillRect(Math.floor(x * r), Math.floor(y * r), Math.ceil(1 * r), Math.ceil(1 * r));
				}
			}
		}
		// hover
		this.context.globalCompositeOperation = 'difference';
		if (this.hovered && this.x >= 0 && this.y >= 0 && this.x < this.width && this.y < this.height && !this.locked[k(this.x, this.y)]) {
			this.context.fillStyle = this.colorHover;
			this.context.fillRect(this.x * r, this.y * r, 1 * r, 1 * r);
		}
		// gridlines
		this.context.fillStyle = this.colorGrid;
		if (r > this.gridLimit) {
			for (let y = 0; y < this.height; ++y) {
				this.context.fillRect(this.gridSize, Math.floor(y * r), this.width * r - this.gridSize * 2, this.gridSize);
			}
			for (let x = 0; x < this.width; ++x) {
				this.context.fillRect(Math.floor(x * r), this.gridSize, this.gridSize, this.height * r - this.gridSize * 2);
			}
		}
		this.context.fillRect(0, 0, this.gridSize, this.gridSize);
		this.context.fillRect(this.width * r - this.gridSize, 0, this.gridSize, this.height * r);
		this.context.fillRect(0, this.height * r - this.gridSize, this.width * r - this.gridSize, this.gridSize);
		this.context.restore();
	}

	/**
	 * Sets drawing dimensions
	 * @param width
	 * @param height
	 */
	public resize(width: number, height: number) {
		if (this.width === width && this.height === height) return;
		this.width = width;
		this.height = height;
		this.resizeCanvas();
	}

	/**
	 * @param x
	 * @param y
	 * @returns Whether the pixel at [x,y] is locked
	 */
	lock(x: number, y: number): boolean;
	/**
	 * Sets the locked state of the pixel at [x,y]
	 * @param x
	 * @param y
	 * @param locked new lock value
	 */
	lock(x: number, y: number, locked: boolean): void;
	lock(x: number, y: number, locked?: boolean) {
		if (locked === undefined) return this.locked[k(x, y)];
		this.locked[k(x, y)] = locked;
		return;
	}

	/**
	 * @param x
	 * @param y
	 * @returns Whether the pixel at [x,y] is filled
	 */
	fill(x: number, y: number): boolean;
	/**
	 * Sets the filled state of the pixel at [x,y]
	 * @param x
	 * @param y
	 * @param filled new lock value
	 */
	fill(x: number, y: number, filled: boolean): void;
	fill(x: number, y: number, filled?: boolean) {
		if (filled === undefined) return this.filled[k(x, y)];
		this.filled[k(x, y)] = filled;
		return;
	}

	/**
	 * @param type `'drawstart' | 'draw' | 'drawend'`
	 * @param listener
	 */
	addEventListener(
		...[type, listener]:
			| ['drawstart', (ev: CustomEvent<{ x: number; y: number }>) => void]
			| ['draw', (ev: CustomEvent<{ x: number; y: number; value: boolean }>) => void]
			| ['drawend', (ev: CustomEvent<{ x: number; y: number }>) => void]
	) {
		this.canvas.addEventListener(type, listener as Parameters<HTMLCanvasElement['addEventListener']>[1]);
	}

	/**
	 * @param type `'drawstart' | 'draw' | 'drawend'`
	 * @param listener
	 */
	removeEventListener(
		...[type, listener]:
			| ['drawstart', (ev: CustomEvent<{ x: number; y: number }>) => void]
			| ['draw', (ev: CustomEvent<{ x: number; y: number; value: boolean }>) => void]
			| ['drawend', (ev: CustomEvent<{ x: number; y: number }>) => void]
	) {
		this.canvas.removeEventListener(type, listener as Parameters<HTMLCanvasElement['addEventListener']>[1]);
	}
}
