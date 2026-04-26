(function () {
    function getApiBase() {
        var b = document.body;
        if (!b || !b.dataset) return '';
        var raw = (b.getAttribute('data-api-base') || '').trim();
        return raw.replace(/\/$/, '');
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var id = this.getAttribute('href');
            if (!id || id === '#') return;
            var target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                var mobileMenu = document.getElementById('mobile-menu');
                var menuBtn = document.getElementById('mobile-menu-btn');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    var menuBtn = document.getElementById('mobile-menu-btn');
    var mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function () {
            var isClosed = mobileMenu.classList.toggle('hidden');
            menuBtn.setAttribute('aria-expanded', String(!isClosed));
        });
    }

    var observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
        observer.observe(el);
    });

    var modal = document.getElementById('booking-modal');
    var form = document.getElementById('booking-form');
    var closeBtn = document.getElementById('booking-modal-close');
    var experienceSelect = document.getElementById('booking-experience');
    var dateInput = document.getElementById('booking-date');
    var formBlock = document.getElementById('booking-form-block');
    var successPanel = document.getElementById('booking-success');
    var errorBanner = document.getElementById('booking-error');
    var submitBtn = document.getElementById('booking-submit-btn');
        var successCloseBtn = document.getElementById('booking-success-close');
        var anotherBtn = document.getElementById('booking-another-btn');
        var apiBase = getApiBase();

    if (modal && form && closeBtn && experienceSelect && dateInput && formBlock && successPanel) {
        var lastFocus = null;

        function closeMobileMenuIfOpen() {
            var mm = document.getElementById('mobile-menu');
            var mb = document.getElementById('mobile-menu-btn');
            if (mm && !mm.classList.contains('hidden')) {
                mm.classList.add('hidden');
                if (mb) mb.setAttribute('aria-expanded', 'false');
            }
        }

        function setDateMin() {
            var t = new Date();
            t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
            dateInput.min = t.toISOString().slice(0, 10);
            if (!dateInput.value || dateInput.value < dateInput.min) {
                dateInput.value = dateInput.min;
            }
        }

        function hideBookingError() {
            if (errorBanner) {
                errorBanner.textContent = '';
                errorBanner.classList.remove('is-visible');
            }
        }

        function showBookingError(msg) {
            if (!errorBanner) return;
            errorBanner.textContent = msg;
            errorBanner.classList.add('is-visible');
        }

        function resetBookingModalUI() {
            hideBookingError();
            formBlock.classList.remove('is-hidden');
            successPanel.classList.remove('is-visible');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.removeAttribute('aria-busy');
            }
        }

        function openModal(preset) {
            lastFocus = document.activeElement;
            closeMobileMenuIfOpen();
            setDateMin();
            resetBookingModalUI();
            form.reset();
            setDateMin();
            var allowed = ['track-day', 'karting', 'rocket-rally'];
            var key = allowed.indexOf(preset) !== -1 ? preset : 'track-day';
            experienceSelect.value = key;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            var panel = modal.querySelector('.booking-modal-panel');
            if (panel) panel.scrollTop = 0;
            experienceSelect.focus();
        }

        function closeModal() {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            resetBookingModalUI();
            form.reset();
            if (lastFocus && typeof lastFocus.focus === 'function') {
                lastFocus.focus();
            }
        }

        function showBookingSuccess() {
            formBlock.classList.add('is-hidden');
            successPanel.classList.add('is-visible');
            successPanel.focus();
        }

        document.querySelectorAll('.booking-trigger').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openModal(btn.getAttribute('data-booking-preset') || 'track-day');
            });
        });

        modal.querySelectorAll('[data-booking-close]').forEach(function (el) {
            el.addEventListener('click', closeModal);
        });
        closeBtn.addEventListener('click', closeModal);
        if (successCloseBtn) {
            successCloseBtn.addEventListener('click', closeModal);
        }
        if (anotherBtn) {
            anotherBtn.addEventListener('click', function () {
                resetBookingModalUI();
                form.reset();
                setDateMin();
                hideBookingError();
                if (experienceSelect) experienceSelect.focus();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });

        modal.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab' || !modal.classList.contains('is-open')) return;
            var list = Array.from(
                modal.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );
            if (list.length === 0) return;
            var first = list[0];
            var last = list[list.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            hideBookingError();
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            var experience_type = experienceSelect.value;
            var preferred_date = dateInput.value;
            var party_size = parseInt(document.getElementById('booking-people').value, 10);
            var full_name = document.getElementById('booking-name').value.trim();
            var email = document.getElementById('booking-email').value.trim();
            var phone = document.getElementById('booking-phone').value.trim();

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.setAttribute('aria-busy', 'true');
            }

            fetch(apiBase + '/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    experience_type: experience_type,
                    preferred_date: preferred_date,
                    party_size: party_size,
                    full_name: full_name,
                    email: email,
                    phone: phone,
                }),
            })
                .then(function (res) {
                    return res.json().then(function (data) {
                        return { ok: res.ok, status: res.status, data: data };
                    });
                })
                .then(function (result) {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.removeAttribute('aria-busy');
                    }
                    if (result.ok && result.data && result.data.id) {
                        showBookingSuccess();
                        successPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        return;
                    }
                    var msg =
                        (result.data && (result.data.error || result.data.details)) ||
                        (result.status === 503
                            ? 'Booking is temporarily unavailable. Please try again or email sales@utahmotorsportscampus.com.'
                            : 'Something went wrong. Please try again or contact us by email.');
                    showBookingError(typeof msg === 'string' ? msg : 'Request failed. Please try again.');
                })
                .catch(function () {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.removeAttribute('aria-busy');
                    }
                    showBookingError('Network error. Check your connection and try again.');
                });
        });
    }

    var waitlistForm = document.getElementById('garage-waitlist-form');
    var waitlistFormBlock = document.getElementById('waitlist-form-block');
    var waitlistSuccess = document.getElementById('waitlist-success');
    var waitlistReset = document.getElementById('waitlist-reset');
    var waitlistSubmit = document.getElementById('waitlist-submit-btn');
    var waitlistError = document.getElementById('waitlist-error');

    if (waitlistForm && waitlistFormBlock && waitlistSuccess && waitlistReset) {
        function hideWaitlistError() {
            if (waitlistError) {
                waitlistError.textContent = '';
                waitlistError.classList.remove('is-visible');
            }
        }

        function showWaitlistError(msg) {
            if (!waitlistError) return;
            waitlistError.textContent = msg;
            waitlistError.classList.add('is-visible');
        }

        function showWaitlistSuccess() {
            hideWaitlistError();
            waitlistFormBlock.classList.add('is-hidden');
            waitlistSuccess.classList.add('is-visible');
            waitlistSuccess.focus();
        }

        function hideWaitlistSuccess() {
            waitlistFormBlock.classList.remove('is-hidden');
            waitlistSuccess.classList.remove('is-visible');
        }

        waitlistForm.addEventListener('submit', function (e) {
            e.preventDefault();
            hideWaitlistError();
            if (!waitlistForm.checkValidity()) {
                waitlistForm.reportValidity();
                return;
            }
            var fd = new FormData(waitlistForm);
            var payload = {
                full_name: (fd.get('full_name') || '').toString().trim(),
                email: (fd.get('email') || '').toString().trim(),
                phone: (fd.get('phone') || '').toString().trim(),
                notes: (fd.get('notes') || '').toString().trim() || null,
            };
            if (waitlistSubmit) {
                waitlistSubmit.disabled = true;
                waitlistSubmit.setAttribute('aria-busy', 'true');
            }
            fetch(apiBase + '/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
                .then(function (res) {
                    return res.json().then(function (data) {
                        return { ok: res.ok, status: res.status, data: data };
                    });
                })
                .then(function (result) {
                    if (waitlistSubmit) {
                        waitlistSubmit.disabled = false;
                        waitlistSubmit.removeAttribute('aria-busy');
                    }
                    if (result.ok && result.data && result.data.id) {
                        showWaitlistSuccess();
                        waitlistSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        return;
                    }
                    var msg =
                        (result.data && (result.data.error || result.data.details)) ||
                        (result.status === 503
                            ? 'Waitlist is temporarily unavailable. Please email sales@utahmotorsportscampus.com.'
                            : 'Something went wrong. Please try again.');
                    showWaitlistError(typeof msg === 'string' ? msg : 'Request failed.');
                })
                .catch(function () {
                    if (waitlistSubmit) {
                        waitlistSubmit.disabled = false;
                        waitlistSubmit.removeAttribute('aria-busy');
                    }
                    showWaitlistError('Network error. Check your connection and try again.');
                });
        });

        waitlistReset.addEventListener('click', function () {
            waitlistForm.reset();
            hideWaitlistSuccess();
            hideWaitlistError();
            var nameEl = document.getElementById('waitlist-name');
            if (nameEl) nameEl.focus();
        });
    }
})();
