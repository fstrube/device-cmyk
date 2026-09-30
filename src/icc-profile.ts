function base64ToArrayBuffer(b64: string): ArrayBuffer {
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
	  bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function readAscii(view: DataView, offset: number, length: number): string {
  var chars = [];
  for (var i = 0; i < length; i++) {
	  chars.push(String.fromCharCode(view.getUint8(offset + i)));
  }
  return chars.join('');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerp3(a: number[], b: number[], t: number): number[] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function sampleCurve(table: Uint16Array, x: number): number {
  var n = table.length - 1;
  var pos = Math.min(n, Math.max(0, x)) * n;
  var i = Math.min(n - 1, Math.floor(pos));
  var t = pos - i;
  return lerp(table[i], table[i + 1], t) / 65535;
}

function parseMft2(view: DataView, offset: number): {
  inputChan: number;
  outputChan: number;
  grid: number;
  inputTables: Uint16Array[];
  clut: Uint16Array;
  outputTables: Uint16Array[];
} {
  var inputChan = view.getUint8(offset + 8);
  var outputChan = view.getUint8(offset + 9);
  var grid = view.getUint8(offset + 10);
  var inputEntries = view.getUint16(offset + 48);
  var outputEntries = view.getUint16(offset + 50);
  var p = offset + 52;
  var inputTables: Uint16Array[] = [];
  var c, i;

  for (c = 0; c < inputChan; c++) {
		var inputTable = new Uint16Array(inputEntries);
		for (i = 0; i < inputEntries; i++, p += 2) {
			inputTable[i] = view.getUint16(p);
		}
		inputTables.push(inputTable);
  }

  var clutPoints = Math.pow(grid, inputChan);
  var clut = new Uint16Array(clutPoints * outputChan);
  for (i = 0; i < clut.length; i++, p += 2) {
	  clut[i] = view.getUint16(p);
  }

  var outputTables = [];
  for (c = 0; c < outputChan; c++) {
		var outputTable = new Uint16Array(outputEntries);
		for (i = 0; i < outputEntries; i++, p += 2) {
			outputTable[i] = view.getUint16(p);
		}
		outputTables.push(outputTable);
  }

  return {
		inputChan: inputChan,
		outputChan: outputChan,
		grid: grid,
		inputTables: inputTables,
		clut: clut,
		outputTables: outputTables,
  };
}

function findIccTag(view: DataView, signature: string): { offset: number; size: number } | null {
  var tagCount = view.getUint32(128);
  var i;
  for (i = 0; i < tagCount; i++) {
		var entry = 132 + i * 12;
		if (readAscii(view, entry, 4) === signature) {
			return {
			offset: view.getUint32(entry + 4),
			size: view.getUint32(entry + 8),
			};
		}
  }
  return null;
}

function parseCmykIcc(buffer: ArrayBuffer): {
  inputChan: number;
  outputChan: number;
  grid: number;
  inputTables: Uint16Array[];
  clut: Uint16Array;
  outputTables: Uint16Array[];
} {
  var view = new DataView(buffer);
  var lutOffset = 0;

  if (readAscii(view, 0, 4) === 'mft2') {
		lutOffset = 0;
  } else {
		if (readAscii(view, 36, 4) !== 'acsp') {
			throw new Error('Not an ICC profile');
		}
		if (readAscii(view, 16, 4) !== 'CMYK') {
			throw new Error('ICC profile is not CMYK');
		}
		var tag = findIccTag(view, 'A2B1') || findIccTag(view, 'A2B0');
		if (!tag) {
			throw new Error('ICC profile has no A2B tag');
		}
		if (readAscii(view, tag.offset, 4) !== 'mft2') {
			throw new Error('Unsupported ICC LUT type ' + readAscii(view, tag.offset, 4));
		}
		lutOffset = tag.offset;
  }

  return parseMft2(view, lutOffset);
}

function sampleClut4(lut: {
  grid: number;
  clut: Uint16Array;
}, c: number, m: number, y: number, k: number): number[] {
  var g = lut.grid;
  var max = g - 1;
  var cf = c * max;
  var mf = m * max;
  var yf = y * max;
  var kf = k * max;
  var c0 = Math.min(max - 1, Math.floor(cf));
  var m0 = Math.min(max - 1, Math.floor(mf));
  var y0 = Math.min(max - 1, Math.floor(yf));
  var k0 = Math.min(max - 1, Math.floor(kf));
  var c1 = Math.min(max, c0 + 1);
  var m1 = Math.min(max, m0 + 1);
  var y1 = Math.min(max, y0 + 1);
  var k1 = Math.min(max, k0 + 1);
  var ct = cf - c0;
  var mt = mf - m0;
  var yt = yf - y0;
  var kt = kf - k0;

  function at(ci: number, mi: number, yi: number, ki: number): number[] {
		var index = (((ci * g + mi) * g + yi) * g + ki) * 3;
		return [lut.clut[index] / 65535, lut.clut[index + 1] / 65535, lut.clut[index + 2] / 65535];
  }

  var c000 = lerp3(at(c0, m0, y0, k0), at(c0, m0, y0, k1), kt);
  var c001 = lerp3(at(c0, m0, y1, k0), at(c0, m0, y1, k1), kt);
  var c010 = lerp3(at(c0, m1, y0, k0), at(c0, m1, y0, k1), kt);
  var c011 = lerp3(at(c0, m1, y1, k0), at(c0, m1, y1, k1), kt);
  var c100 = lerp3(at(c1, m0, y0, k0), at(c1, m0, y0, k1), kt);
  var c101 = lerp3(at(c1, m0, y1, k0), at(c1, m0, y1, k1), kt);
  var c110 = lerp3(at(c1, m1, y0, k0), at(c1, m1, y0, k1), kt);
  var c111 = lerp3(at(c1, m1, y1, k0), at(c1, m1, y1, k1), kt);

  var c00 = lerp3(c000, c001, yt);
  var c01 = lerp3(c010, c011, yt);
  var c10 = lerp3(c100, c101, yt);
  var c11 = lerp3(c110, c111, yt);

  return lerp3(lerp3(c00, c01, mt), lerp3(c10, c11, mt), ct);
}

function pcsLab(values: number[], outputTables: Uint16Array[]): { L: number; a: number; b: number } {
  var encoded = [];
  var i;
  for (i = 0; i < 3; i++) {
		encoded.push(sampleCurve(outputTables[i], values[i]));
  }
  return {
		L: (encoded[0] * 65535 * 100) / 65280,
		a: encoded[1] * 255 - 128,
		b: encoded[2] * 255 - 128,
  };
}

function labToXyzD50(L: number, a: number, b: number): { x: number; y: number; z: number } {
  var fy = (L + 16) / 116;
  var fx = a / 500 + fy;
  var fz = fy - b / 200;
  var eps = 216 / 24389;
  var kappa = 24389 / 27;

  function fInv(f: number): number {
		var f3 = f * f * f;
		return f3 > eps ? f3 : (116 * f - 16) / kappa;
  }

  return {
		x: fInv(fx) * 0.96422,
		y: (L > kappa * eps ? Math.pow((L + 16) / 116, 3) : L / kappa) * 1.0,
		z: fInv(fz) * 0.82521,
  };
}

function xyzD50ToSrgb(x: number, y: number, z: number): number[] {
  var xd = 0.9554734527042182 * x - 0.023098536874261423 * y + 0.0632593086610217 * z;
  var yd = -0.028369706963208235 * x + 1.0099954582233684 * y + 0.021041398966943008 * z;
  var zd = 0.012314001688319899 * x - 0.020507696433477912 * y + 1.3303658253542128 * z;

  var r = 3.2409699419045226 * xd - 1.537383177570093 * yd - 0.4986107602930034 * zd;
  var g = -0.9692436362808796 * xd + 1.8759675015077202 * yd + 0.04155505740717559 * zd;
  var b = 0.05563007969699366 * xd - 0.20397695888897652 * yd + 1.0569715142428786 * zd;

  function compand(channel: number): number {
		channel = Math.min(1, Math.max(0, channel));
		return channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  }

  return [compand(r) * 255, compand(g) * 255, compand(b) * 255];
}

export function createCmykIccTransform(buffer: ArrayBuffer): (c: number, m: number, y: number, k: number) => number[] {
  var lut = parseCmykIcc(buffer);

  return function cmykToSrgb(c: number, m: number, y: number, k: number): number[] {
		var input = [
			sampleCurve(lut.inputTables[0], c),
			sampleCurve(lut.inputTables[1], m),
			sampleCurve(lut.inputTables[2], y),
			sampleCurve(lut.inputTables[3], k),
		];
		var pcs = sampleClut4(lut, input[0], input[1], input[2], input[3]);
		var lab = pcsLab(pcs, lut.outputTables);
		var xyz = labToXyzD50(lab.L, lab.a, lab.b);
		return xyzD50ToSrgb(xyz.x, xyz.y, xyz.z);
  };
}

export default class ICCProfile {
  public transform: (c: number, m: number, y: number, k: number) => number[];

  constructor(buffer: ArrayBuffer) {
    this.transform = createCmykIccTransform(buffer);
  }

  static async open(url: string) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    return new ICCProfile(buffer);
  }
}
