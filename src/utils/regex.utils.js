module.exports = {
    nameRegex: () => /^[a-zA-Z0-9\-\&()+.,'@[\]$ ]+$/,
    nameRegexMsg: (field) => ({
        'string.pattern.base': `${field} can only contain letters, numbers, -, &, (, ), ., ', ", @, and $ (no other special characters).`
    }),

    addressRegex: () => /^[a-zA-Z0-9\-\&()+.'@$#,\\"/ ]+$/,
    addressRegexMsg: () => `Address can only contain letters, numbers, -, &, (, ), ., ', ", @, $, #, ,, \ and / (no other special characters).`,
}
