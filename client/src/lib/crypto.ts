const MAGIC = 'NPENC1:';
const SALT_LEN = 16;
const IV_LEN = 12;
const ITERATIONS = 150_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64encode = (bytes: Uint8Array): string => {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
};
const b64decode = (str: string): Uint8Array => {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
};

const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase) as BufferSource,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

export const isEncryptedPayload = (s: string | null | undefined): boolean => {
    return typeof s === 'string' && s.startsWith(MAGIC);
};

export const encryptWithPassphrase = async (plaintext: string, passphrase: string): Promise<string> => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(passphrase, salt);
    const ct = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        enc.encode(plaintext) as BufferSource
    );
    const ctBytes = new Uint8Array(ct);
    const buf = new Uint8Array(salt.length + iv.length + ctBytes.length);
    buf.set(salt, 0);
    buf.set(iv, salt.length);
    buf.set(ctBytes, salt.length + iv.length);
    return MAGIC + b64encode(buf);
};

export const decryptWithPassphrase = async (payload: string, passphrase: string): Promise<string | null> => {
    if (!isEncryptedPayload(payload)) return null;
    try {
        const buf = b64decode(payload.slice(MAGIC.length));
        if (buf.length < SALT_LEN + IV_LEN + 1) return null;
        const salt = buf.slice(0, SALT_LEN);
        const iv = buf.slice(SALT_LEN, SALT_LEN + IV_LEN);
        const ct = buf.slice(SALT_LEN + IV_LEN);
        const key = await deriveKey(passphrase, salt);
        const plain = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as BufferSource },
            key,
            ct as BufferSource
        );
        return dec.decode(plain);
    } catch {
        return null;
    }
};
