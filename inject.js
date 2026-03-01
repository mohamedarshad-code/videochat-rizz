(function() {
    // Save original addIceCandidate
    const originalAddIceCandidate = RTCPeerConnection.prototype.addIceCandidate;

    // Proxy the function to intercept candidates
    RTCPeerConnection.prototype.addIceCandidate = function(candidate, ...args) {
        if (candidate && candidate.candidate) {
            // Forward the candidate to the content script
            window.postMessage({
                type: 'ICE_CANDIDATE',
                candidate: candidate.candidate
            }, '*');
        }
        return originalAddIceCandidate.apply(this, [candidate, ...args]);
    };

    console.log('[LiveChat Navigator] IP Tracer injected.');
})();
