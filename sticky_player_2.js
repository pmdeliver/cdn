(function () {
  var audio    = document.getElementById('orhAudio');
  var player   = document.getElementById('orh-player');
  var wv       = document.getElementById('orhWv');
  var bpIcon   = document.getElementById('orhBpIcon');
  var pageIcon = document.getElementById('orhPageIcon');
  var pageLbl  = document.getElementById('orhPageLbl');
  var dot      = document.getElementById('orhDot');
  var subTxt   = document.getElementById('orhSubTxt');
  var playing  = false;
  var hlsInstance = null;

  var PLAY  = '<polygon points="6 3 20 12 6 21 6 3"/>';
  var PAUSE = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

  audio.volume = 0.8;

  function _setLive() {
    dot.classList.remove('orh-offline');
    subTxt.textContent = 'Live';
  }
  function _setOffline() {
    dot.classList.add('orh-offline');
    subTxt.textContent = 'Offline';
  }

  // Parse "or"-separated URLs from the <source> src attribute
  var sourceEl = audio.querySelector('source');
  var urls = sourceEl.getAttribute('src').split(/\s+or\s+/).map(function(u){ return u.trim(); });
  var urlIndex = 0;

  function _isHLS(url) {
    return /\.m3u8(\?|$)/i.test(url);
  }

  // Returns true if the current page is served over HTTPS
  function _pageIsHttps() {
    return window.location.protocol === 'https:';
  }

  // Returns true if the URL is HTTP (non-secure)
  function _urlIsHttp(url) {
    return /^http:/i.test(url);
  }

  // Mixed content: HTTPS page + HTTP stream URL.
  // Browsers block this silently or with a network error.
  // We skip such URLs unless the page itself is HTTP.
  function _isMixedContent(url) {
    return _pageIsHttps() && _urlIsHttp(url);
  }

  function _destroyHls() {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
  }

  // Try to probe an HTTP URL using a no-cors fetch.
  // Resolves true if reachable (even opaque), false on network block.
  function _probeHttpUrl(url) {
    return fetch(url, { method: 'GET', mode: 'no-cors' })
      .then(function() { return true; })
      .catch(function() { return false; });
  }

  function _loadUrl(index) {
    if (index >= urls.length) {
      _setOffline();
      return;
    }

    var url = urls[index];
    urlIndex = index;

    // If we're on an HTTPS page and the stream URL is HTTP,
    // the browser will block it (mixed content). Skip to the next URL immediately.
    if (_isMixedContent(url)) {
      console.warn('[OrhPlayer] Skipping mixed-content HTTP URL on HTTPS page:', url);
      _loadUrl(index + 1);
      return;
    }

    _destroyHls();

    if (_isHLS(url)) {
      if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari — native HLS support
        audio.src = url;
        audio.load();
      } else if (window.Hls && Hls.isSupported()) {
        // Chrome, Firefox, Edge, Opera — use HLS.js
        hlsInstance = new Hls({
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          maxBufferLength: 30
        });
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(audio);
        hlsInstance.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            _onError();
          }
        });
      } else {
        // HLS.js not supported — try next URL
        _onError();
      }
    } else {
      // Plain audio stream (mp3, aac, etc.)
      // For HTTP URLs on an HTTP page, probe first to give a fast fallback
      // if the stream is unreachable (Firefox stalls instead of firing 'error').
      if (_urlIsHttp(url) && !_pageIsHttps()) {
        _probeHttpUrl(url).then(function(reachable) {
          if (reachable) {
            audio.src = url;
            audio.load();
            if (playing) audio.play().catch(function(){});
          } else {
            console.warn('[OrhPlayer] HTTP stream unreachable, trying next:', url);
            _loadUrl(index + 1);
          }
        });
      } else {
        audio.src = url;
        audio.load();
      }
    }
  }

  function _onError() {
    if (urlIndex < urls.length - 1) {
      _loadUrl(urlIndex + 1);
      if (playing) audio.play().catch(function(){});
    } else {
      _setOffline();
    }
  }

  // On native audio error, try next URL in the list
  audio.addEventListener('error', _onError);

  // Audio is actively playing → Live
  audio.addEventListener('playing', _setLive);

  // Stream stalled or ended → Offline
  audio.addEventListener('stalled', _setOffline);
  audio.addEventListener('ended',   _setOffline);

  // Paused by user → Offline
  audio.addEventListener('pause',   _setOffline);

  window.orhTogglePlay = function () {
    playing ? _pause() : _play();
  };

  window.orhSetVol = function (v) {
    audio.volume = v / 100;
  };

  function _play() {
    if (!audio.src && !hlsInstance) _loadUrl(0);
    audio.play().catch(function (e) { console.warn('Audio blocked:', e); });
    playing = true;
    player.classList.add('orh-open');
    document.body.classList.add('orh-body-pad');
    wv.classList.add('orh-playing');
    bpIcon.innerHTML    = PAUSE;
    pageIcon.innerHTML  = PAUSE;
    pageLbl.textContent = 'Pause';
  }

  function _pause() {
    audio.pause();
    playing = false;
    wv.classList.remove('orh-playing');
    bpIcon.innerHTML    = PLAY;
    pageIcon.innerHTML  = PLAY;
    pageLbl.textContent = 'Play';
  }
})();