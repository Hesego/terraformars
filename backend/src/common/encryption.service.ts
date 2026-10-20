import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
    private readonly secretKey: string;

    constructor(private configService: ConfigService) {
        const key = this.configService.get<string>('ENCRYPTION_KEY');
        if (!key || key.length < 16) {
            throw new Error('FATAL: ENCRYPTION_KEY missing or too weak (min 16 chars)');
        }
        this.secretKey = key;
    }

    encrypt(text: string): string {
        return CryptoJS.AES.encrypt(text, this.secretKey).toString();
    }

    decrypt(ciphertext: string): string {
        const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}
