(function () {
    function getApiBase() {
        var b = document.body;
        if (!b || !b.dataset) return '';
        var raw = (b.getAttribute('data-api-base') || '').trim();
        return raw.replace(/\/$/, '');
    }

    /** Set by booking modal init; used by floating chat quick actions. */
    var openBookingWithPreset = null;

    function getPathPrefix() {
        var path = window.location.pathname || '';
        var segs = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
        if (segs.length && /\.html?$/i.test(segs[segs.length - 1])) {
            segs.pop();
        }
        return segs.length ? segs.map(function () { return '..'; }).join('/') + '/' : '';
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
        var submitBtnDefaultLabel = 'Send booking request';
        if (submitBtn && submitBtn.textContent) {
            submitBtnDefaultLabel = submitBtn.textContent.replace(/\s+/g, ' ').trim() || 'Send booking request';
        }

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

        function showBookingToast(message) {
            var el = document.createElement('div');
            el.className = 'wf-booking-toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            el.textContent = message;
            document.body.appendChild(el);
            requestAnimationFrame(function () {
                el.classList.add('is-visible');
            });
            setTimeout(function () {
                el.classList.remove('is-visible');
                setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 320);
            }, 4800);
        }

        function resetBookingModalUI() {
            hideBookingError();
            formBlock.classList.remove('is-hidden');
            successPanel.classList.remove('is-visible');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.removeAttribute('aria-busy');
                submitBtn.textContent = submitBtnDefaultLabel;
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

        openBookingWithPreset = function (preset) {
            openModal(preset || 'track-day');
        };

        document.body.addEventListener('click', function (e) {
            var btn = e.target.closest('.booking-trigger');
            if (!btn) return;
            e.preventDefault();
            openModal(btn.getAttribute('data-booking-preset') || 'track-day');
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
            var notesEl = document.getElementById('booking-notes');
            var notes = notesEl ? (notesEl.value || '').trim() : '';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.setAttribute('aria-busy', 'true');
                submitBtn.textContent = 'Submitting…';
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
                    notes: notes.length > 0 ? notes : null,
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
                        submitBtn.textContent = submitBtnDefaultLabel;
                    }
                    if (result.ok && result.data && (result.data.id != null)) {
                        showBookingToast("Booking request received! We'll contact you shortly.");
                        closeModal();
                        return;
                    }
                    if (result.status === 500) {
                        showBookingError(
                            'We could not save your request. Please try again or contact us by email.'
                        );
                        return;
                    }
                    if (result.status === 503) {
                        showBookingError(
                            'Booking is temporarily unavailable. Please try again or email sales@utahmotorsportscampus.com.'
                        );
                        return;
                    }
                    var errPart = result.data && (result.data.error || result.data.details);
                    var msg =
                        (typeof errPart === 'string' ? errPart : errPart && String(errPart)) ||
                        'Something went wrong. Please try again or contact us by email.';
                    showBookingError(msg);
                })
                .catch(function () {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.removeAttribute('aria-busy');
                        submitBtn.textContent = submitBtnDefaultLabel;
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

    (function initFloatingCampusChat() {
        if (document.getElementById('umc-chat-root')) return;

        var pathPrefix = getPathPrefix();
        var chatApiBase = getApiBase();
        var history = [];
        var lastLauncherFocus = null;

        var root = document.createElement('div');
        root.id = 'umc-chat-root';
        root.className = 'umc-chat-root';
        root.innerHTML =
            '<button type="button" id="umc-chat-launcher" class="umc-chat-launcher" aria-expanded="false" aria-controls="umc-chat-panel">' +
            '<i class="fa-solid fa-comments umc-launcher-icon-open text-xl" aria-hidden="true"></i>' +
            '<i class="fa-solid fa-xmark umc-launcher-icon-close text-xl" aria-hidden="true"></i>' +
            '<span class="sr-only">Toggle member concierge</span>' +
            '</button>' +
            '<div id="umc-chat-panel" class="umc-chat-panel chat-shell" role="dialog" aria-modal="true" aria-labelledby="umc-chat-title" aria-hidden="true">' +
            '<div class="umc-chat-panel-header">' +
            '<div class="umc-chat-panel-title">' +
            '<div class="umc-chat-avatar" aria-hidden="true"><i class="fa-solid fa-bolt text-white text-sm"></i></div>' +
            '<div><h2 id="umc-chat-title" class="umc-chat-heading">Campus Assistant</h2>' +
            '<p class="umc-chat-sub">Powered by <span class="text-zinc-400">xAI Grok</span></p></div></div>' +
            '<button type="button" id="umc-chat-close" class="umc-chat-close" aria-label="Close assistant"><i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i></button>' +
            '</div>' +
            '<div id="umc-chat-messages" class="umc-chat-messages chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>' +
            '<div class="umc-chat-composer">' +
            '<p class="umc-chat-quick-label">Quick replies</p>' +
            '<div class="umc-chat-quick" id="umc-quick-replies">' +
            '<button type="button" class="umc-quick-reply" data-quick="karting">Book Karting</button>' +
            '<button type="button" class="umc-quick-reply" data-quick="rocket">Book Rocket Rally</button>' +
            '<button type="button" class="umc-quick-reply" data-quick="waitlist">Join Garage Waitlist</button>' +
            '<button type="button" class="umc-quick-reply" data-quick="question">Ask a Question</button>' +
            '</div>' +
            '<form id="umc-chat-form" class="umc-chat-form">' +
            '<label for="umc-chat-input" class="sr-only">Message</label>' +
            '<textarea id="umc-chat-input" class="umc-chat-input booking-field" rows="1" placeholder="Message the assistant…" autocomplete="off"></textarea>' +
            '<button type="submit" class="umc-chat-send" aria-label="Send message"><i class="fa-solid fa-paper-plane text-lg" aria-hidden="true"></i></button>' +
            '</form></div></div>' +
            '<button type="button" id="umc-trigger-book-karting" class="booking-trigger sr-only" tabindex="-1" data-booking-preset="karting" aria-hidden="true">Book Karting</button>' +
            '<button type="button" id="umc-trigger-book-rocket" class="booking-trigger sr-only" tabindex="-1" data-booking-preset="rocket-rally" aria-hidden="true">Book Rocket Rally</button>';

        document.body.appendChild(root);

        var launcher = document.getElementById('umc-chat-launcher');
        var panel = document.getElementById('umc-chat-panel');
        var closeBtnChat = document.getElementById('umc-chat-close');
        var messagesEl = document.getElementById('umc-chat-messages');
        var chatForm = document.getElementById('umc-chat-form');
        var chatInput = document.getElementById('umc-chat-input');
        var triggerKarting = document.getElementById('umc-trigger-book-karting');
        var triggerRocket = document.getElementById('umc-trigger-book-rocket');

        function escapeHtml(s) {
            var d = document.createElement('div');
            d.textContent = s;
            return d.innerHTML;
        }

        function formatAssistantMarkdown(text) {
            var h = escapeHtml(text);
            h = h.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
            var gp = pathPrefix + 'garages/index.html';
            h = h.replace(
                /\[Garages\]\(\/garages\/\)/g,
                '<a href="' +
                    gp +
                    '" class="text-[#c5a26f] hover:text-[#e8d5b5] underline underline-offset-2">Private Garages waitlist</a>'
            );
            return h.replace(/\n/g, '<br>');
        }

        function appendBubble(role, html, plain, recordHistory) {
            var wrap = document.createElement('div');
            wrap.className = 'msg-enter flex ' + (role === 'user' ? 'justify-end' : 'justify-start');
            var bubble = document.createElement('div');
            bubble.className =
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ' +
                (role === 'user'
                    ? 'bg-gradient-to-br from-red-600 to-red-700 text-white rounded-br-md border border-red-500/30'
                    : 'bg-zinc-900/95 text-zinc-200 border border-zinc-700/90 rounded-bl-md');
            bubble.innerHTML = html;
            wrap.appendChild(bubble);
            messagesEl.appendChild(wrap);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            if (recordHistory !== false && plain !== undefined && plain !== null && plain !== '') {
                history.push({ role: role, content: plain });
            }
        }

        function showTyping() {
            var wrap = document.createElement('div');
            wrap.id = 'umc-typing-indicator';
            wrap.className = 'msg-enter flex justify-start';
            wrap.innerHTML =
                '<div class="bg-zinc-900/95 border border-zinc-700/90 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center shadow-lg" role="status" aria-live="polite">' +
                '<span class="typing-dot w-2 h-2 rounded-full bg-[#c5a26f]"></span>' +
                '<span class="typing-dot w-2 h-2 rounded-full bg-[#c5a26f]"></span>' +
                '<span class="typing-dot w-2 h-2 rounded-full bg-[#c5a26f]"></span>' +
                '</div>';
            messagesEl.appendChild(wrap);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function hideTyping() {
            var el = document.getElementById('umc-typing-indicator');
            if (el) el.remove();
        }

        function fetchAssistantReply() {
            var apiMessages = history
                .filter(function (m) {
                    return m.role === 'user' || m.role === 'assistant';
                })
                .map(function (m) {
                    return { role: m.role, content: m.content };
                });
            return fetch(chatApiBase + '/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            }).then(function (res) {
                return res.json().then(function (data) {
                    return { ok: res.ok, data: data };
                });
            });
        }

        function sendUserMessage(text) {
            var trimmed = text.trim();
            if (!trimmed) return Promise.resolve();
            appendBubble('user', escapeHtml(trimmed).replace(/\n/g, '<br>'), trimmed);
            chatInput.value = '';
            chatInput.style.height = 'auto';
            showTyping();
            return fetchAssistantReply()
                .then(function (result) {
                    hideTyping();
                    if (result.ok && result.data && result.data.message) {
                        appendBubble('assistant', formatAssistantMarkdown(result.data.message), result.data.message);
                        return;
                    }
                    var msg =
                        (result.data && (result.data.error || result.data.hint)) ||
                        'Assistant unavailable. Try again or email sales@utahmotorsportscampus.com.';
                    throw new Error(typeof msg === 'string' ? msg : 'Error');
                })
                .catch(function () {
                    hideTyping();
                    var fb =
                        'I couldn’t reach the assistant. Please try again, use **Book Your Experience**, or email **sales@utahmotorsportscampus.com**.';
                    appendBubble('assistant', formatAssistantMarkdown(fb), '', false);
                });
        }

        function openChatPanel() {
            lastLauncherFocus = document.activeElement;
            panel.classList.add('is-open');
            panel.setAttribute('aria-hidden', 'false');
            launcher.setAttribute('aria-expanded', 'true');
            launcher.classList.add('is-active');
            document.body.classList.add('umc-chat-open');
            chatInput.focus();
        }

        function closeChatPanel() {
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            launcher.setAttribute('aria-expanded', 'false');
            launcher.classList.remove('is-active');
            document.body.classList.remove('umc-chat-open');
            if (lastLauncherFocus && typeof lastLauncherFocus.focus === 'function') {
                lastLauncherFocus.focus();
            } else {
                launcher.focus();
            }
        }

        launcher.addEventListener('click', function () {
            if (panel.classList.contains('is-open')) {
                closeChatPanel();
            } else {
                openChatPanel();
            }
        });
        closeBtnChat.addEventListener('click', closeChatPanel);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!panel.classList.contains('is-open')) return;
            var bookModal = document.getElementById('booking-modal');
            if (bookModal && bookModal.classList.contains('is-open')) return;
            closeChatPanel();
        });

        appendBubble(
            'assistant',
            formatAssistantMarkdown(
                'Welcome to **Wildfire Raceway**. Ask about membership, the circuit, karting, our in-house **Rocket Rally** experience, private events, or **Private Garages**. Quick replies can open booking for you.'
            ),
            '',
            false
        );

        chatForm.addEventListener('submit', function (e) {
            e.preventDefault();
            sendUserMessage(chatInput.value);
        });

        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage(chatInput.value);
            }
        });

        chatInput.addEventListener('input', function () {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 128) + 'px';
        });

        document.querySelectorAll('.umc-quick-reply').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var q = btn.getAttribute('data-quick');
                if (q === 'karting') {
                    if (triggerKarting) triggerKarting.click();
                    sendUserMessage('I’d like to book karting.');
                } else if (q === 'rocket') {
                    if (triggerRocket) triggerRocket.click();
                    sendUserMessage('I’d like to book Rocket Rally.');
                } else if (q === 'waitlist') {
                    sendUserMessage('I want to join the Private Garage waitlist.');
                } else if (q === 'question') {
                    chatInput.focus();
                }
            });
        });
    })();
})();
