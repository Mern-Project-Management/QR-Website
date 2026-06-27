module.exports = {
    apps: [
        {
            name: "odokho",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3059 -H 127.0.0.1",
            cwd: "/var/www/rndprojects/QR-Website",
            instances: 1,
            exec_mode: "fork",
            watch: false,
            autorestart: true,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production",
                PORT: 3059
            }
        }
    ]
};