
const crypto = require('crypto');

class DataEncryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        this.secretKey = this.generateSecretKey();
    }

    generateSecretKey() {
        // في بيئة الإنتاج، يجب تخزين هذا المفتاح بشكل آمن
        return crypto.randomBytes(this.keyLength);
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, this.secretKey);
            cipher.setAAD(Buffer.from('additional-data'));
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex')
            };
        } catch (error) {
            console.error('خطأ في التشفير:', error);
            return null;
        }
    }

    decrypt(encryptedData) {
        try {
            const { encrypted, iv, tag } = encryptedData;
            const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
            
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            decipher.setAAD(Buffer.from('additional-data'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('خطأ في فك التشفير:', error);
            return null;
        }
    }

    // تشفير كلمات المرور
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return { hash, salt };
    }

    verifyPassword(password, hash, salt) {
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    // إنشاء توقيع رقمي للتحقق من سلامة البيانات
    createSignature(data) {
        return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
    }

    verifySignature(data, signature) {
        const expectedSignature = this.createSignature(data);
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
}

module.exports = DataEncryption;
