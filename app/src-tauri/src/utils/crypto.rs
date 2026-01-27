use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::Rng;
use sha2::{Digest, Sha256};

use crate::error::TakaError;

const SALT: &[u8] = b"taka_api_key_encryption_salt_v1";
const NONCE_SIZE: usize = 12;

fn derive_key() -> Result<[u8; 32], TakaError> {
    let machine_id = machine_uid::get()
        .map_err(|e| TakaError::Crypto(format!("Failed to get machine ID: {}", e)))?;

    let mut hasher = Sha256::new();
    hasher.update(machine_id.as_bytes());
    hasher.update(SALT);

    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);

    Ok(key)
}

pub fn encrypt(plaintext: &str) -> Result<String, TakaError> {
    let key = derive_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| TakaError::Crypto(format!("Failed to create cipher: {}", e)))?;

    let mut rng = rand::thread_rng();
    let mut nonce_bytes = [0u8; NONCE_SIZE];
    rng.fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| TakaError::Crypto(format!("Encryption failed: {}", e)))?;

    let mut combined = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&combined))
}

pub fn decrypt(encrypted: &str) -> Result<String, TakaError> {
    let key = derive_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| TakaError::Crypto(format!("Failed to create cipher: {}", e)))?;

    let combined = BASE64
        .decode(encrypted)
        .map_err(|e| TakaError::Crypto(format!("Invalid base64: {}", e)))?;

    if combined.len() < NONCE_SIZE {
        return Err(TakaError::Crypto("Invalid encrypted data".to_string()));
    }

    let (nonce_bytes, ciphertext) = combined.split_at(NONCE_SIZE);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| TakaError::Crypto(format!("Decryption failed: {}", e)))?;

    String::from_utf8(plaintext)
        .map_err(|e| TakaError::Crypto(format!("Invalid UTF-8: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let original = "sk-1234567890abcdef";
        let encrypted = encrypt(original).unwrap();
        let decrypted = decrypt(&encrypted).unwrap();
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_different_encryptions() {
        let original = "test-api-key";
        let encrypted1 = encrypt(original).unwrap();
        let encrypted2 = encrypt(original).unwrap();
        assert_ne!(encrypted1, encrypted2);

        assert_eq!(decrypt(&encrypted1).unwrap(), original);
        assert_eq!(decrypt(&encrypted2).unwrap(), original);
    }
}
