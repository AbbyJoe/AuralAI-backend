import path from 'path';
import fs from 'fs';
import { ROOT_DIR } from '../config/env.js';

let essInstance = null;
let EssentiaCtor = null;
let EssentiaWasmLoader = null;
let EssentiaModule = null;

async function initEssentia() {
  if (essInstance) return essInstance;

  console.log('Initializing Essentia.js WASM...');
  const EssentiaPkg = await import('essentia.js');
  EssentiaWasmLoader =
    EssentiaPkg.EssentiaWasm ||
    EssentiaPkg.EssentiaWASM ||
    EssentiaPkg.default?.EssentiaWasm ||
    EssentiaPkg.default?.EssentiaWASM;
  EssentiaCtor =
    EssentiaPkg.Essentia ||
    EssentiaPkg.default?.Essentia ||
    EssentiaPkg;

  if (!EssentiaWasmLoader || !EssentiaCtor) {
    const wasmJsPath = path.join(ROOT_DIR, 'node_modules', 'essentia.js', 'dist', 'essentia-wasm.js');
    if (fs.existsSync(wasmJsPath)) {
      const mod = await import(`file://${wasmJsPath}`);
      EssentiaWasmLoader =
        EssentiaWasmLoader ||
        mod.EssentiaWasm ||
        mod.EssentiaWASM ||
        mod.default?.EssentiaWasm;
      EssentiaCtor =
        EssentiaCtor ||
        mod.Essentia ||
        mod.default?.Essentia ||
        mod;
    }
  }

  if (!EssentiaWasmLoader || !EssentiaCtor) {
    throw new Error('Cannot find EssentiaWasm loader or Essentia constructor in essentia.js package.');
  }

  const wasmPathCandidate = path.join(ROOT_DIR, 'node_modules', 'essentia.js', 'dist', 'essentia-wasm.wasm');
  const wasmOption = fs.existsSync(wasmPathCandidate) ? { wasm: wasmPathCandidate } : undefined;

  let wasmModule = null;
  if (typeof EssentiaWasmLoader === 'function') {
    wasmModule = await EssentiaWasmLoader(wasmOption);
  } else if (EssentiaWasmLoader?.default && typeof EssentiaWasmLoader.default === 'function') {
    wasmModule = await EssentiaWasmLoader.default(wasmOption);
  } else if (EssentiaWasmLoader?.Module && typeof EssentiaWasmLoader.Module === 'function') {
    wasmModule = await EssentiaWasmLoader.Module(wasmOption);
  } else if (EssentiaWasmLoader && typeof EssentiaWasmLoader === 'object') {
    wasmModule = EssentiaWasmLoader;
  }

  if (!wasmModule) {
    throw new Error('EssentiaWasm loader did not return a module instance');
  }

  try {
    essInstance = new EssentiaCtor(wasmModule);
  } catch (err) {
    essInstance = new EssentiaCtor.Essentia ? new EssentiaCtor.Essentia(wasmModule) : new EssentiaCtor(wasmModule);
  }

  if (!essInstance) {
    throw new Error('Failed to instantiate Essentia');
  }

  EssentiaModule = wasmModule;
  console.log('✅ Essentia initialized successfully');
  return essInstance;
}

function getEssentia() {
  if (!essInstance) {
    throw new Error('Essentia not initialized');
  }
  return essInstance;
}

function disposeVector(vec) {
  try {
    if (vec && typeof vec.delete === 'function') vec.delete();
  } catch {
    // ignore
  }
}

function toFloat32Array(data) {
  if (!data) return null;
  if (ArrayBuffer.isView(data)) return new Float32Array(data);
  if (Array.isArray(data)) return Float32Array.from(data);

  const ess = essInstance;
  if (ess?.vectorToArray) {
    try {
      const arr = ess.vectorToArray(data);
      if (arr) return new Float32Array(arr);
    } catch {
      // ignore conversion errors
    }
  }

  if (typeof data?.size === 'function' && typeof data?.get === 'function') {
    const len = data.size();
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) out[i] = Number(data.get(i)) || 0;
    return out;
  }

  return null;
}

export { initEssentia, getEssentia, disposeVector, toFloat32Array };

