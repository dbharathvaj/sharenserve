const express = require("express");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");
const ngos = require("./data/ngos");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret-before-production";

// Parse JSON payloads and enable a simple session cookie for authenticated NGOs.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        name: "shareandserve.sid",
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 1000 * 60 * 60 * 6
        }
    })
);

app.use(express.static(__dirname));

function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPassword(password, config) {
    // PBKDF2 keeps password storage hashed without introducing another crypto dependency.
    return crypto
        .pbkdf2Sync(password, config.salt, config.iterations, config.keylen, config.digest)
        .toString("hex");
}

function verifyPassword(password, passwordConfig) {
    const storedHashBuffer = Buffer.from(passwordConfig.hash, "hex");
    const computedHashBuffer = Buffer.from(hashPassword(password, passwordConfig), "hex");

    if (storedHashBuffer.length !== computedHashBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(storedHashBuffer, computedHashBuffer);
}

function sanitizeNgo(ngo) {
    return {
        id: ngo.id,
        ngoName: ngo.ngoName,
        username: ngo.username,
        email: ngo.email
    };
}

app.post("/api/auth/login", function loginHandler(req, res) {
    const identifier = (req.body.identifier || "").trim().toLowerCase();
    const password = req.body.password || "";
    const rememberMe = Boolean(req.body.rememberMe);

    if (!identifier || !password) {
        return res.status(400).json({
            message: "Email/username and password are required."
        });
    }

    if (identifier.indexOf("@") !== -1 && !isEmail(identifier)) {
        return res.status(400).json({
            message: "Enter a valid email address."
        });
    }

    // Allow login with either the NGO email or username.
    const ngo = ngos.find(function matchNgo(item) {
        return item.email.toLowerCase() === identifier || item.username.toLowerCase() === identifier;
    });

    if (!ngo || !verifyPassword(password, ngo.passwordConfig)) {
        return res.status(401).json({
            message: "Invalid NGO credentials. Please try again."
        });
    }

    req.session.ngo = sanitizeNgo(ngo);
    req.session.cookie.maxAge = rememberMe ? 1000 * 60 * 60 * 24 * 14 : 1000 * 60 * 60 * 6;

    return res.json({
        message: "Welcome back. Your NGO dashboard session is ready.",
        redirectUrl: "index.html",
        ngo: req.session.ngo
    });
});

app.post("/api/auth/forgot-password", function forgotPasswordHandler(req, res) {
    const email = (req.body.email || "").trim().toLowerCase();

    if (!email || !isEmail(email)) {
        return res.status(400).json({
            message: "Enter a valid NGO email address to continue."
        });
    }

    const ngo = ngos.find(function matchNgo(item) {
        return item.email.toLowerCase() === email;
    });

    // Replace this log with your email provider or Firebase reset flow in production.
    if (ngo) {
        console.log("Password reset requested for %s", ngo.email);
    }

    return res.json({
        message: "If this NGO email is registered, reset instructions have been queued."
    });
});

app.get("/api/auth/session", function sessionHandler(req, res) {
    if (!req.session.ngo) {
        return res.status(401).json({
            message: "No active NGO session."
        });
    }

    return res.json({
        ngo: req.session.ngo
    });
});

app.get("/", function rootHandler(req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/ngo-login", function loginPageHandler(req, res) {
    res.sendFile(path.join(__dirname, "ngo-login.html"));
});

app.listen(PORT, function startServer() {
    console.log("Share & Serve server running on http://localhost:%s", PORT);
});
