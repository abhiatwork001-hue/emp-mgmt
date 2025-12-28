const fs = require('fs');
const path = require('path');

const MESSAGES_PATH = path.join(process.cwd(), 'src/messages/en.json');
const SRC_PATH = path.join(process.cwd(), 'src');

// Read existing translations
const translations = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));

// Helper to check if key exists (nested)
function checkKey(namespace, key) {
    if (!translations[namespace]) return false;
    return translations[namespace][key] !== undefined;
}

// Recursive file walker
function* walkSync(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            yield* walkSync(path.join(dir, file.name));
        } else {
            yield path.join(dir, file.name);
        }
    }
}

// Regex to find hook usage: const t = useTranslations("Namespace") or getTranslations("Namespace")
const HOOK_REGEX = /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\(\s*["']([^"']+)["']\s*\)/g;

// Regex to find t("key") usage: t("key") or t('key')
// We need to match variable name dynamically
const missingKeys = [];

for (const filePath of walkSync(SRC_PATH)) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    const content = fs.readFileSync(filePath, 'utf8');

    // Find all translation hooks references in this file
    let match;
    while ((match = HOOK_REGEX.exec(content)) !== null) {
        const varName = match[1]; // e.g., 't' or 'tc'
        const namespace = match[2]; // e.g., 'Common'

        // Now search for usages of this varName in the file
        // Regex: varName('key') or varName("key")
        const keyRegex = new RegExp(`\\b${varName}\\s*\\(\\s*["']([^"']+)["']`, 'g');

        let keyMatch;
        while ((keyMatch = keyRegex.exec(content)) !== null) {
            const key = keyMatch[1];
            if (!checkKey(namespace, key)) {
                missingKeys.push({
                    file: path.relative(process.cwd(), filePath),
                    namespace,
                    key
                });
            }
        }
    }
}

if (missingKeys.length > 0) {
    console.log("Missing Keys Found:");
    missingKeys.forEach(mk => {
        console.log(`[${mk.namespace}.${mk.key}] in ${mk.file}`);
    });
} else {
    console.log("No missing keys found in simple static analysis.");
}
