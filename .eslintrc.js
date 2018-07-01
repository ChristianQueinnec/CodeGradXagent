module.exports = {
    "rules": {
        "linebreak-style": [
            2,
            "unix"
        ],
        "semi": [
            2,  // Check for missing semi-colons
            "always"
        ],
        "no-console": [
            0  // allow console.log()
        ]
    },
    "parserOptions": {
        "ecmaVersion": 6
    },
    "env": {
        "es6": true,
        "browser": true,
        "node": true
    },
    "globals": {
        "grecaptcha": true,
        "google": true,
        "console": true,
        "FW4EX": true
    },
    "extends": "eslint:recommended"
};
