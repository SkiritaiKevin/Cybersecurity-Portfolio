document.documentElement.classList.add("js");

const yearElements = document.querySelectorAll("[data-current-year]");
yearElements.forEach((element) => {
    element.textContent = new Date().getFullYear();
});

const emailLinks = document.querySelectorAll('a[href^="mailto:"]');

if (emailLinks.length) {
    const copyNotice = document.createElement("div");
    copyNotice.className = "copy-notice";
    copyNotice.setAttribute("role", "status");
    copyNotice.setAttribute("aria-live", "polite");
    document.body.appendChild(copyNotice);

    let noticeTimer;

    const showCopyNotice = (message) => {
        window.clearTimeout(noticeTimer);
        copyNotice.textContent = message;
        copyNotice.classList.add("is-visible");

        noticeTimer = window.setTimeout(() => {
            copyNotice.classList.remove("is-visible");
        }, 2200);
    };

    const copyText = async (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const copyField = document.createElement("textarea");
        copyField.value = text;
        copyField.setAttribute("readonly", "");
        copyField.style.position = "fixed";
        copyField.style.opacity = "0";
        document.body.appendChild(copyField);
        copyField.select();

        const copied = document.execCommand("copy");
        copyField.remove();

        if (!copied) {
            throw new Error("Clipboard copy failed");
        }
    };

    emailLinks.forEach((link) => {
        const email = link.href.slice("mailto:".length).split("?")[0];
        link.setAttribute("title", "Copy email address");
        link.setAttribute("aria-label", `Copy email address ${email}`);

        link.addEventListener("click", async (event) => {
            event.preventDefault();

            try {
                await copyText(email);
                showCopyNotice("Email copied to clipboard");
            } catch {
                showCopyNotice("Could not copy email");
            }
        });
    });
}

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12
    });

    revealElements.forEach((element) => revealObserver.observe(element));
} else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
}
