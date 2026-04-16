// Cache the login UI elements once so the form logic stays easy to maintain.
const form = document.getElementById("ngo-login-form");
const identifierInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const loginButton = document.getElementById("login-button");
const feedback = document.getElementById("auth-feedback");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const fillDemoAccountLink = document.getElementById("fill-demo-account");

const fieldErrors = {
    identifier: document.getElementById("identifier-error"),
    password: document.getElementById("password-error")
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const demoNgoAccount = {
    identifier: "ngo@shareandserve.org",
    username: "hopehands",
    password: "Ngo@12345",
    ngo: {
        id: "ngo-001",
        ngoName: "Hope Hands Foundation",
        username: "hopehands",
        email: "ngo@shareandserve.org"
    }
};

function setFieldError(fieldName, message) {
    const input = fieldName === "identifier" ? identifierInput : passwordInput;
    input.classList.toggle("input-error", Boolean(message));
    fieldErrors[fieldName].textContent = message || "";
}

function setFeedback(message, type) {
    feedback.textContent = message || "";
    feedback.className = "auth-feedback";

    if (type) {
        feedback.classList.add(type === "error" ? "is-error" : "is-success");
    }
}

function validateForm() {
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value.trim();
    let isValid = true;

    setFieldError("identifier", "");
    setFieldError("password", "");
    setFeedback("", "");

    if (!identifier) {
        setFieldError("identifier", "Email or username is required.");
        isValid = false;
    } else if (identifier.includes("@") && !emailPattern.test(identifier)) {
        setFieldError("identifier", "Enter a valid email address.");
        isValid = false;
    }

    if (!password) {
        setFieldError("password", "Password is required.");
        isValid = false;
    }

    return isValid;
}

async function readResponsePayload(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();
    return {
        message: text && text.trim()
            ? text.trim()
            : "The login service returned an unexpected response."
    };
}

function saveNgoSession(rememberMe) {
    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    storage.setItem("shareandserve.ngoSession", JSON.stringify(demoNgoAccount.ngo));
}

function tryDemoLogin(payload) {
    const normalizedIdentifier = payload.identifier.trim().toLowerCase();
    const matchesDemoIdentifier =
        normalizedIdentifier === demoNgoAccount.identifier ||
        normalizedIdentifier === demoNgoAccount.username;

    if (!matchesDemoIdentifier || payload.password !== demoNgoAccount.password) {
        return null;
    }

    saveNgoSession(payload.rememberMe);

    return {
        message: "Welcome back. Demo NGO login completed.",
        redirectUrl: "index.html",
        ngo: demoNgoAccount.ngo
    };
}

async function handleLogin(event) {
    event.preventDefault();

    if (!validateForm()) {
        return;
    }

    // Send the minimal payload the backend needs for authentication.
    const payload = {
        identifier: identifierInput.value.trim(),
        password: passwordInput.value,
        rememberMe: rememberMeInput.checked
    };

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    setFeedback("Checking your NGO account...", "success");

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify(payload)
        });

        const result = await readResponsePayload(response);

        if (!response.ok) {
            throw new Error(result.message || "Unable to log in.");
        }

        setFeedback(result.message || "Login successful.", "success");
        window.setTimeout(function redirectAfterLogin() {
            window.location.href = result.redirectUrl || "index.html";
        }, 800);
    } catch (error) {
        const demoResult = tryDemoLogin(payload);

        if (demoResult) {
            setFeedback(demoResult.message, "success");
            window.setTimeout(function redirectAfterFallbackLogin() {
                window.location.href = demoResult.redirectUrl;
            }, 800);
            return;
        }

        const isJsonParseIssue = error instanceof SyntaxError;
        setFeedback(
            isJsonParseIssue
                ? "Login service is not returning valid JSON. Demo login is available with the sample NGO account."
                : error.message === "Failed to fetch"
                    ? "Backend is unavailable. Use the demo NGO credentials or start the Express server."
                    : error.message || "Something went wrong. Please try again.",
            "error"
        );
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();

    const identifier = identifierInput.value.trim();

    if (!identifier) {
        setFieldError("identifier", "Enter your NGO email before requesting a reset link.");
        identifierInput.focus();
        return;
    }

    if (!identifier.includes("@") || !emailPattern.test(identifier)) {
        setFieldError("identifier", "Forgot password works with your registered email address.");
        identifierInput.focus();
        return;
    }

    setFieldError("identifier", "");
    setFeedback("Sending reset instructions...", "success");

    try {
        // The page keeps reset handling lightweight and lets the server decide how to process it.
        const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: identifier })
        });

        const result = await readResponsePayload(response);

        if (!response.ok) {
            throw new Error(result.message || "Unable to process reset request.");
        }

        setFeedback(result.message, "success");
    } catch (error) {
        const isJsonParseIssue = error instanceof SyntaxError;
        setFeedback(
            isJsonParseIssue
                ? "Password reset service is not returning valid JSON. Start the Express server and try again."
                : error.message || "Unable to process reset request.",
            "error"
        );
    }
}

function fillDemoAccount(event) {
    event.preventDefault();
    identifierInput.value = "ngo@shareandserve.org";
    passwordInput.value = "Ngo@12345";
    rememberMeInput.checked = true;
    setFieldError("identifier", "");
    setFieldError("password", "");
    setFeedback("Demo credentials filled. You can sign in now.", "success");
}

// Attach listeners after the helper functions are declared.
form.addEventListener("submit", handleLogin);
forgotPasswordLink.addEventListener("click", handleForgotPassword);
fillDemoAccountLink.addEventListener("click", fillDemoAccount);

identifierInput.addEventListener("input", function clearIdentifierError() {
    if (fieldErrors.identifier.textContent) {
        setFieldError("identifier", "");
    }
});

passwordInput.addEventListener("input", function clearPasswordError() {
    if (fieldErrors.password.textContent) {
        setFieldError("password", "");
    }
});
