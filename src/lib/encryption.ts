import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Fallback key (32 bytes hex) for development ONLY. In production, this MUST be in .env
const DEV_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || DEV_KEY, 'hex');

export function encrypt(text: string) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        encryptedData: encrypted,
        iv: iv.toString('hex')
    };
}

export function decrypt(encryptedData: string, ivHex: string) {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
