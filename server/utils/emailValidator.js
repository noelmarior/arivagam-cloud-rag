const validator = require('validator');
const dns = require('dns');

// Top 10 common disposable domains
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com',
    '10minutemail.com',
    'tempmail.com',
    'temp-mail.org',
    'guerrillamail.com',
    'yopmail.com',
    'throwawaymail.com',
    'tempmail.net',
    'dispostable.com',
    'getairmail.com'
]);

const validateEmailStrict = async (email) => {
    // 1. Syntax Check
    if (!validator.isEmail(email)) {
        throw new Error('Invalid email format');
    }

    const domain = email.split('@')[1].toLowerCase();

    // 2. Disposable Domain Check
    if (DISPOSABLE_DOMAINS.has(domain)) {
        throw new Error('Disposable email addresses are not allowed');
    }

    // 3. MX Record Lookup
    try {
        const records = await dns.promises.resolveMx(domain);
        if (!records || records.length === 0) {
            throw new Error('No mail servers found for this domain');
        }
    } catch (error) {
        throw new Error('Invalid domain or active mail server not reachable');
    }

    return true;
};

module.exports = { validateEmailStrict };
