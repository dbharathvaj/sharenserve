const defaultDonations = [
    {
        name: "Sunrise Hotel",
        donorType: "Hotel",
        contact: "9876543210",
        foodType: "Vegetarian",
        quantity: "50",
        bestBefore: "4 Hours",
        address: "Anna Nagar, Chennai",
        details: "Fresh buffet meals packed for pickup.",
        createdAt: new Date().toISOString()
    },
    {
        name: "Green Basket",
        donorType: "Restaurant",
        contact: "9123456780",
        foodType: "Packaged",
        quantity: "30",
        bestBefore: "6 Hours",
        address: "T Nagar, Chennai",
        details: "Packed meals and fruit bowls.",
        createdAt: new Date().toISOString()
    },
    {
        name: "City Convention Hall",
        donorType: "Event",
        contact: "9988776655",
        foodType: "Mixed",
        quantity: "120",
        bestBefore: "2 Hours",
        address: "Guindy, Chennai",
        details: "Urgent pickup required.",
        createdAt: new Date().toISOString()
    }
];

function getStoredDonations() {
    const raw = window.localStorage.getItem("shareandserve-donations");

    if (!raw) {
        window.localStorage.setItem("shareandserve-donations", JSON.stringify(defaultDonations));
        return [...defaultDonations];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [...defaultDonations];
    } catch (error) {
        return [...defaultDonations];
    }
}

function saveDonations(donations) {
    window.localStorage.setItem("shareandserve-donations", JSON.stringify(donations));
}

function getDeadline(bestBefore, createdAt) {
    const hours = parseInt(String(bestBefore).replace(" Hours", ""), 10) || 0;
    const deadline = new Date(createdAt);
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
}

function getCardClass(foodType) {
    const label = String(foodType).toLowerCase();

    if (label.includes("packaged")) {
        return "fruits";
    }

    if (label.includes("fruit") || label.includes("vegetable")) {
        return "fruits";
    }

    return "cooked";
}

function getTimeLeft(bestBefore, createdAt) {
    const deadline = getDeadline(bestBefore, createdAt);
    const diff = deadline.getTime() - Date.now();

    if (diff <= 0) {
        return { label: "Expired", urgent: true };
    }

    const hrs = Math.floor(diff / 1000 / 60 / 60);
    const mins = Math.floor((diff / 1000 / 60) % 60);

    return {
        label: `${hrs}h ${mins}m`,
        urgent: hrs < 2
    };
}

function renderDonationCard(donation) {
    const timeLeft = getTimeLeft(donation.bestBefore, donation.createdAt);
    const foodClass = getCardClass(donation.foodType);

    return `
        <article class="card ${timeLeft.urgent ? "urgent" : ""}">
            <div class="card-header">
                <div>
                    <h3>${donation.name}</h3>
                    <div class="type">${donation.donorType}</div>
                </div>
                <div class="status">${timeLeft.urgent ? "Urgent" : "Available"}</div>
            </div>
            <div class="tag ${foodClass}${timeLeft.urgent ? " urgent" : ""}">${donation.foodType}</div>
            <div class="info"><span>${donation.quantity}</span> servings</div>
            <div class="info">${donation.contact}</div>
            <div class="info best-before">Time left: ${timeLeft.label}</div>
            <div class="address">${donation.address}</div>
            <button type="button" class="claim-button">Claim Donation</button>
        </article>
    `;
}

function renderDonationList(searchValue) {
    const cardGrid = document.getElementById("donation-list");

    if (!cardGrid) {
        return;
    }

    const query = String(searchValue || "").trim().toLowerCase();
    const donations = getStoredDonations().filter((donation) => {
        const haystack = [
            donation.name,
            donation.donorType,
            donation.foodType,
            donation.address,
            donation.details
        ].join(" ").toLowerCase();

        return haystack.includes(query);
    });

    if (!donations.length) {
        cardGrid.innerHTML = '<div class="empty-state">No donations match your search right now.</div>';
        return;
    }

    cardGrid.innerHTML = donations
        .slice()
        .reverse()
        .map(renderDonationCard)
        .join("");
}

function setupDonationForm() {
    const form = document.getElementById("donation-form");
    const message = document.getElementById("donation-message");

    if (!form) {
        return;
    }

    form.addEventListener("submit", function handleDonationSubmit(event) {
        event.preventDefault();

        const formData = new FormData(form);
        const donation = {
            name: String(formData.get("name") || "").trim(),
            donorType: String(formData.get("donorType") || "").trim(),
            contact: String(formData.get("contact") || "").trim(),
            foodType: String(formData.get("foodType") || "").trim(),
            quantity: String(formData.get("quantity") || "").trim(),
            bestBefore: String(formData.get("bestBefore") || "").trim(),
            address: String(formData.get("address") || "").trim(),
            details: String(formData.get("details") || "").trim(),
            createdAt: new Date().toISOString()
        };

        if (!donation.name || !donation.quantity || !donation.address || !donation.foodType || !donation.bestBefore) {
            if (message) {
                message.textContent = "Please fill all required fields before submitting.";
            }
            return;
        }

        if (donation.contact && !/^\d{10}$/.test(donation.contact)) {
            if (message) {
                message.textContent = "Enter a valid 10-digit phone number.";
            }
            return;
        }

        const donations = getStoredDonations();
        donations.push(donation);
        saveDonations(donations);
        form.reset();

        if (message) {
            message.textContent = "Donation added successfully. It is now visible on the Find Donations page.";
        }
    });
}

function setupDonationSearch() {
    const searchBox = document.getElementById("donation-search");

    if (!searchBox) {
        return;
    }

    renderDonationList("");

    searchBox.addEventListener("input", function handleSearch() {
        renderDonationList(searchBox.value);
    });
}

function setupClaimButtons() {
    document.addEventListener("click", function handleClaim(event) {
        const target = event.target;

        if (!(target instanceof HTMLElement) || !target.classList.contains("claim-button")) {
            return;
        }

        target.textContent = "Claimed";
        target.style.background = "gray";
        target.setAttribute("disabled", "true");
    });
}

document.addEventListener("DOMContentLoaded", function initializeSitePages() {
    setupDonationForm();
    setupDonationSearch();
    setupClaimButtons();
});
